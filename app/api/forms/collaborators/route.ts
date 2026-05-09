import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { normalizeCnpj, isValidCnpjFormat } from '@/lib/auth/cnpj'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'

type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR' | 'TOO_MANY_REQUESTS'

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

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const ip = getClientIp(request)
    const rateLimit = await checkRateLimit(`forms-collaborators:${ip}`, { limit: 60, windowMs: 60_000 })
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas requisicoes. Tente novamente em instantes.' } },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSec),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        }
      )
    }

    const url = new URL(request.url)
    const cnpj = normalizeCnpj(url.searchParams.get('cnpj') ?? '')
    if (!isValidCnpjFormat(cnpj)) {
      return errorResponse(422, 'VALIDATION_ERROR', 'CNPJ invalido.')
    }

    const admin = getSupabaseAdminClient()
    const { data: company, error: companyError } = await admin
      .from('companies')
      .select('id, cnpj, status')
      .eq('cnpj', cnpj)
      .eq('status', 'active')
      .maybeSingle()

    if (companyError || !company?.id) {
      return errorResponse(404, 'NOT_FOUND', 'Empresa nao encontrada para este CNPJ.')
    }

    const { data: collaborators, error: collabError } = await admin
      .from('copsoq_collaborators')
      .select('id, external_employee_id, full_name, is_active')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .order('full_name', { ascending: true })
      .limit(500)

    if (collabError) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao listar colaboradores.')
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          companyId: company.id,
          companyCnpj: cnpj,
          collaborators:
            collaborators?.map((row) => ({
              id: row.id,
              externalEmployeeId: row.external_employee_id,
              fullName: row.full_name,
            })) ?? [],
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao listar colaboradores.', details)
  }
}
