import { getSupabaseServerClient } from '@/lib/supabase/server'
import { secureCompare } from '@/lib/security/crypto'

type CopsoqUserProfile = {
  user_id: string
  role: string
  company_id: string | null
  is_active: boolean
  login_email: string
}

export type CopsoqAccessContext =
  | {
      mode: 'api_key'
      canReadIndividual: true
      canReadAggregate: true
      canRecomputeAggregate: true
      companyId: null
      role: 'integration'
      isTechnical: true
      userId: null
      loginEmail: null
    }
  | {
      mode: 'user'
      canReadIndividual: boolean
      canReadAggregate: boolean
      canRecomputeAggregate: boolean
      companyId: string | null
      role: string
      isTechnical: boolean
      userId: string
      loginEmail: string
    }

function getTechnicalEmails(): Set<string> {
  const raw = process.env.NOVAVIX_COPSOQ_TECHNICAL_EMAILS ?? ''
  return new Set(
    raw
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)
  )
}

const TECHNICAL_ROLES = new Set(['admin', 'tecnico'])
const SCOPED_COMPANY_ROLES = new Set(['empresa', 'clinica'])

function isTechnicalProfile(role: string, loginEmail: string): boolean {
  if (TECHNICAL_ROLES.has(role)) {
    return true
  }

  const technicalEmails = getTechnicalEmails()
  return technicalEmails.has(loginEmail.toLowerCase())
}

export async function resolveCopsoqAccessContext(request: Request): Promise<CopsoqAccessContext | null> {
  const expectedApiKey = process.env.NOVAVIX_COPSOQ_API_KEY
  const providedApiKey = request.headers.get('x-api-key')

  if (expectedApiKey && providedApiKey && secureCompare(providedApiKey, expectedApiKey)) {
    return {
      mode: 'api_key',
      canReadIndividual: true,
      canReadAggregate: true,
      canRecomputeAggregate: true,
      companyId: null,
      role: 'integration',
      isTechnical: true,
      userId: null,
      loginEmail: null,
    }
  }

  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profileData, error } = await supabase
    .from('user_profiles')
    .select('user_id, role, company_id, is_active, login_email')
    .eq('user_id', user.id)
    .maybeSingle()

  const profile = profileData as CopsoqUserProfile | null

  if (error || !profile || !profile.is_active) {
    return null
  }

  const role = profile.role
  const loginEmail = profile.login_email
  const isTechnical = isTechnicalProfile(role, loginEmail)
  const hasScopedCompanyAccess = SCOPED_COMPANY_ROLES.has(role) && Boolean(profile.company_id)

  return {
    mode: 'user',
    canReadIndividual: isTechnical,
    canReadAggregate: hasScopedCompanyAccess || isTechnical,
    canRecomputeAggregate: isTechnical,
    companyId: profile.company_id,
    role,
    isTechnical,
    userId: profile.user_id,
    loginEmail,
  }
}

export function canAccessCompanyScope(context: CopsoqAccessContext, companyId: string): boolean {
  if (context.mode === 'api_key') {
    return true
  }

  if (!companyId || companyId.trim().length === 0) {
    return false
  }

  if (context.isTechnical) {
    return true
  }

  if (context.role === 'empresa' || context.role === 'clinica') {
    return context.companyId === companyId
  }

  return false
}

export function getCopsoqMinRespondentsThreshold(): number {
  const raw = Number(process.env.NOVAVIX_COPSOQ_MIN_GROUP_RESPONDENTS ?? '5')
  if (!Number.isFinite(raw) || raw < 1) {
    return 5
  }
  return Math.floor(raw)
}
