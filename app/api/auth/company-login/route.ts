import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { parseCompanyLoginPayload } from '@/lib/validators/company-login'

type ApiErrorCode = 'INVALID_JSON' | 'VALIDATION_ERROR' | 'AUTH_FAILED' | 'INTERNAL_ERROR'

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: string[]
): NextResponse {
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

export async function POST(request: Request): Promise<NextResponse> {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Body precisa ser JSON valido.')
    }

    const parsed = parseCompanyLoginPayload(body)
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Dados de login invalidos.', parsed.errors)
    }

    const admin = getSupabaseAdminClient()

    const { data, error } = await admin
      .from('user_profiles')
      .select('login_email, role, is_active, companies!inner(cnpj, status)')
      .eq('role', 'empresa')
      .eq('is_active', true)
      .eq('companies.cnpj', parsed.data.cnpj)
      .eq('companies.status', 'active')
      .maybeSingle()

    if (error || !data?.login_email) {
      return errorResponse(401, 'AUTH_FAILED', 'Credenciais invalidas.')
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          email: data.login_email,
          role: data.role,
        },
      },
      { status: 200 }
    )
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao processar login da empresa.')
  }
}

