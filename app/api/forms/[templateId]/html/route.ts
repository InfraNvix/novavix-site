import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { FormTemplateSchema } from '@/lib/forms/parser'
import { renderTemplateHtml } from '@/lib/forms/render-html'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getClientIp } from '@/lib/security/http'
import { getPublicErrorDetails, logServerError } from '@/lib/security/safe-error'

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

export async function GET(
  _request: Request,
  context: { params: { templateId: string } }
): Promise<NextResponse> {
  try {
    const ip = getClientIp(_request)
    const rateLimit = await checkRateLimit(`forms-template-html:${ip}`, { limit: 60, windowMs: 60_000 })
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

    const templateId = (context.params.templateId ?? '').trim()
    if (!templateId) {
      return errorResponse(422, 'VALIDATION_ERROR', 'templateId obrigatorio.')
    }

    const admin = getSupabaseAdminClient()
    const { data, error } = await admin
      .from('company_form_templates')
      .select('id, template_name, schema_json, status')
      .eq('id', templateId)
      .eq('status', 'active')
      .maybeSingle()

    if (error || !data?.id) {
      return errorResponse(404, 'NOT_FOUND', 'Template nao encontrado.')
    }

    const schema = data.schema_json as FormTemplateSchema
    if (!schema || !Array.isArray(schema.fields)) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Schema do template invalido.')
    }

    const html = renderTemplateHtml(schema, data.template_name)
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    logServerError('GET /api/forms/[templateId]/html failed', error, { templateId: context.params.templateId })
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao gerar HTML.', getPublicErrorDetails(error))
  }
}
