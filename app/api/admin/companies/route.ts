import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { normalizeCnpj, isValidCnpjFormat } from '@/lib/auth/cnpj'
import { validateStrongPassword } from '@/lib/auth/password-policy'

type ApiErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'DOMAIN_ERROR'
  | 'INTERNAL_ERROR'

function errorResponse(status: number, code: ApiErrorCode, message: string, details?: string[]): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details: details ?? [],
      },
    },
    { status }
  )
}

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse(401, 'UNAUTHORIZED', 'Sessao invalida.')
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.is_active) {
      return errorResponse(403, 'FORBIDDEN', 'Perfil inativo.')
    }

    if (profile.role !== 'admin' && profile.role !== 'tecnico') {
      return errorResponse(403, 'FORBIDDEN', 'Acesso restrito ao admin.')
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Body JSON invalido.')
    }

    if (!body || typeof body !== 'object') {
      return errorResponse(422, 'VALIDATION_ERROR', 'Payload invalido.')
    }

    const payload = body as Record<string, unknown>
    const cnpj = normalizeCnpj(asTrimmed(payload.cnpj))
    const razaoSocial = asTrimmed(payload.razaoSocial)
    const nomeFantasia = asTrimmed(payload.nomeFantasia)
    const password = asTrimmed(payload.password)
    const loginEmailInput = asTrimmed(payload.loginEmail).toLowerCase()
    const generatedEmail = `empresa.${cnpj}@novavix.local`
    const loginEmail = loginEmailInput.length > 0 ? loginEmailInput : generatedEmail

    const errors: string[] = []
    if (!isValidCnpjFormat(cnpj)) {
      errors.push('CNPJ invalido. Informe 14 digitos.')
    }
    if (razaoSocial.length < 3) {
      errors.push('Razao social deve ter ao menos 3 caracteres.')
    }
    const passwordValidation = validateStrongPassword(password)
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors)
    }
    if (!loginEmail.includes('@')) {
      errors.push('E-mail de login invalido.')
    }

    if (errors.length > 0) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Dados invalidos para cadastro.', errors)
    }

    const admin = getSupabaseAdminClient()

    const { data: existingCompany } = await admin
      .from('companies')
      .select('id')
      .eq('cnpj', cnpj)
      .maybeSingle()

    if (existingCompany?.id) {
      return errorResponse(409, 'DOMAIN_ERROR', 'Ja existe empresa com este CNPJ.', ['COMPANY_CNPJ_ALREADY_EXISTS'])
    }

    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('login_email', loginEmail)
      .maybeSingle()

    if (existingProfile?.user_id) {
      return errorResponse(409, 'DOMAIN_ERROR', 'E-mail de login ja utilizado.', ['PROFILE_LOGIN_EMAIL_ALREADY_EXISTS'])
    }

    const { data: insertedCompany, error: companyError } = await admin
      .from('companies')
      .insert({
        cnpj,
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia || null,
        status: 'active',
      })
      .select('id, cnpj, razao_social, nome_fantasia, status')
      .single()

    if (companyError || !insertedCompany) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao criar empresa.')
    }

    const { data: createdUser, error: userError } = await admin.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
      app_metadata: {
        provider: 'email',
      },
      user_metadata: {
        role: 'empresa',
        company_id: insertedCompany.id,
      },
    })

    if (userError || !createdUser?.user?.id) {
      await admin.from('companies').delete().eq('id', insertedCompany.id)
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao criar usuario autenticado para empresa.')
    }

    const companyUserId = createdUser.user.id
    const { error: profileInsertError } = await admin.from('user_profiles').insert({
      user_id: companyUserId,
      role: 'empresa',
      company_id: insertedCompany.id,
      login_email: loginEmail,
      is_active: true,
    })

    if (profileInsertError) {
      await admin.auth.admin.deleteUser(companyUserId)
      await admin.from('companies').delete().eq('id', insertedCompany.id)
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao criar perfil de acesso da empresa.')
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          company: {
            id: insertedCompany.id,
            cnpj: insertedCompany.cnpj,
            razaoSocial: insertedCompany.razao_social,
            nomeFantasia: insertedCompany.nome_fantasia,
            status: insertedCompany.status,
          },
          credentials: {
            loginEmail,
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao cadastrar empresa.', details)
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse(401, 'UNAUTHORIZED', 'Sessao invalida.')
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.is_active) {
      return errorResponse(403, 'FORBIDDEN', 'Perfil inativo.')
    }

    if (profile.role !== 'admin' && profile.role !== 'tecnico' && profile.role !== 'clinica') {
      return errorResponse(403, 'FORBIDDEN', 'Acesso restrito ao admin.')
    }

    const admin = getSupabaseAdminClient()
    const { data, error } = await admin
      .from('companies')
      .select('id, cnpj, razao_social, nome_fantasia, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao listar empresas.')
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          companies:
            data?.map((row) => ({
              id: row.id,
              cnpj: row.cnpj,
              razaoSocial: row.razao_social,
              nomeFantasia: row.nome_fantasia,
              status: row.status,
              createdAt: row.created_at,
            })) ?? [],
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao listar empresas.', details)
  }
}
