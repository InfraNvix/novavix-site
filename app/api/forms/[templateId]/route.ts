import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { normalizeCnpj, isValidCnpjFormat } from '@/lib/auth/cnpj'
import type { FormTemplateSchema } from '@/lib/forms/parser'

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
  request: Request,
  context: { params: { templateId: string } }
): Promise<NextResponse> {
  try {
    const templateId = (context.params.templateId ?? '').trim()
    if (!templateId) {
      return errorResponse(422, 'VALIDATION_ERROR', 'templateId obrigatorio.')
    }

    const url = new URL(request.url)
    const cnpj = normalizeCnpj(url.searchParams.get('cnpj') ?? '')
    if (!isValidCnpjFormat(cnpj)) {
      return errorResponse(422, 'VALIDATION_ERROR', 'CNPJ invalido.')
    }

    const admin = getSupabaseAdminClient()
    const { data, error } = await admin
      .from('company_form_templates')
      .select(
        `
        id,
        company_id,
        template_name,
        schema_json,
        status,
        companies!inner(cnpj, status)
      `
      )
      .eq('id', templateId)
      .eq('status', 'active')
      .eq('companies.cnpj', cnpj)
      .eq('companies.status', 'active')
      .maybeSingle()

    if (error || !data?.id) {
      return errorResponse(404, 'NOT_FOUND', 'Template nao encontrado para este CNPJ.')
    }

    const schema = data.schema_json as FormTemplateSchema
    if (!schema || !Array.isArray(schema.fields)) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Schema do template invalido.')
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          id: data.id,
          companyId: data.company_id,
          companyCnpj: cnpj,
          templateName: data.template_name,
          schema,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao carregar template.', details)
  }
}

