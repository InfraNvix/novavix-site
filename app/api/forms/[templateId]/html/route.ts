import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { FormTemplateSchema } from '@/lib/forms/parser'
import { renderTemplateHtml } from '@/lib/forms/render-html'

type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR'

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
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao gerar HTML.', details)
  }
}
