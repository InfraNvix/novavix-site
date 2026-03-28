import { getSupabaseServerClient } from '@/lib/supabase/server'
import { secureCompare } from '@/lib/security/crypto'
import {
  DEMO_AUTH_COOKIE_NAME,
  DEMO_COMPANY_AUTH,
  DEMO_MODE_ENABLED,
  getDemoCompanyByCnpj,
  getDemoRoleFromCookieValue,
} from '@/lib/auth/demo'

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

function isTechnicalProfile(role: string, loginEmail: string): boolean {
  if (role === 'admin' || role === 'tecnico' || role === 'clinica') {
    return true
  }

  const technicalEmails = getTechnicalEmails()
  return technicalEmails.has(loginEmail.toLowerCase())
}

export async function resolveCopsoqAccessContext(request: Request): Promise<CopsoqAccessContext | null> {
  if (DEMO_MODE_ENABLED) {
    const cookieHeader = request.headers.get('cookie') ?? ''
    const cookieMap = new Map<string, string>(
      cookieHeader
        .split(';')
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 0 && chunk.includes('='))
        .map((chunk) => {
          const idx = chunk.indexOf('=')
          return [chunk.slice(0, idx), decodeURIComponent(chunk.slice(idx + 1))]
        })
    )
    const demoRole = getDemoRoleFromCookieValue(cookieMap.get(DEMO_AUTH_COOKIE_NAME))

    if (demoRole) {
      const demoCompany = getDemoCompanyByCnpj(DEMO_COMPANY_AUTH.cnpj)
      if (demoRole === 'empresa') {
        return {
          mode: 'user',
          canReadIndividual: false,
          canReadAggregate: true,
          canRecomputeAggregate: false,
          companyId: demoCompany?.id ?? null,
          role: 'empresa',
          isTechnical: false,
          userId: 'demo-empresa',
          loginEmail: DEMO_COMPANY_AUTH.email,
        }
      }

      if (demoRole === 'admin') {
        return {
          mode: 'user',
          canReadIndividual: true,
          canReadAggregate: true,
          canRecomputeAggregate: true,
          companyId: null,
          role: 'admin',
          isTechnical: true,
          userId: 'demo-admin',
          loginEmail: 'admin.demo@novavix.local',
        }
      }

      if (demoRole === 'clinica') {
        return {
          mode: 'user',
          canReadIndividual: true,
          canReadAggregate: true,
          canRecomputeAggregate: false,
          companyId: null,
          role: 'clinica',
          isTechnical: true,
          userId: 'demo-clinica',
          loginEmail: 'clinica.demo@novavix.local',
        }
      }
    }
  }

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

  return {
    mode: 'user',
    canReadIndividual: isTechnical,
    canReadAggregate: role === 'empresa' || isTechnical,
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

  if (context.isTechnical) {
    return true
  }

  if (context.role === 'empresa') {
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
