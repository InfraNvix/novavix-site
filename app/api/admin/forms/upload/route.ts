import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { parseCsvTemplate, parseJsonTemplate, parseXlsxTemplate } from '@/lib/forms/parser'

type ApiErrorCode =
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

function detectFormat(fileName: string): 'json' | 'csv' | 'xlsx' | null {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.csv')) return 'csv'
  if (lower.endsWith('.xlsx')) return 'xlsx'
  return null
}

function asText(value: FormDataEntryValue | null): string {
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

    const formData = await request.formData()
    const companyId = asText(formData.get('companyId'))
    const templateName = asText(formData.get('templateName'))
    const file = formData.get('file')

    if (!companyId) {
      return errorResponse(422, 'VALIDATION_ERROR', 'companyId e obrigatorio.')
    }
    if (templateName.length < 3) {
      return errorResponse(422, 'VALIDATION_ERROR', 'templateName deve ter ao menos 3 caracteres.')
    }
    if (!(file instanceof File)) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Arquivo de formulario obrigatorio.')
    }
    if (file.size > 5 * 1024 * 1024) {
      return errorResponse(413, 'VALIDATION_ERROR', 'Arquivo excede 5MB.')
    }

    const format = detectFormat(file.name)
    if (!format) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Formato nao suportado. Use .json, .csv ou .xlsx.')
    }

    const admin = getSupabaseAdminClient()
    const { data: company } = await admin
      .from('companies')
      .select('id, cnpj, nome_fantasia, razao_social')
      .eq('id', companyId)
      .maybeSingle()

    if (!company?.id) {
      return errorResponse(404, 'DOMAIN_ERROR', 'Empresa nao encontrada.', ['COMPANY_NOT_FOUND'])
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    let schema
    try {
      if (format === 'json') {
        schema = parseJsonTemplate(fileBuffer.toString('utf-8'))
      } else if (format === 'csv') {
        schema = parseCsvTemplate(fileBuffer.toString('utf-8'), templateName)
      } else {
        schema = parseXlsxTemplate(fileBuffer, templateName)
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : 'FORM_PARSE_ERROR'
      return errorResponse(422, 'DOMAIN_ERROR', 'Falha ao interpretar arquivo de formulario.', [code])
    }

    const { data: inserted, error: insertError } = await admin
      .from('company_form_templates')
      .insert({
        company_id: companyId,
        template_name: templateName,
        source_format: format,
        source_file_name: file.name,
        schema_json: schema,
        status: 'active',
        uploaded_by_user_id: user.id,
      })
      .select('id, template_name, source_format, source_file_name, status, created_at, schema_json')
      .single()

    if (insertError || !inserted) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao salvar template de formulario.')
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          id: inserted.id,
          templateName: inserted.template_name,
          sourceFormat: inserted.source_format,
          sourceFileName: inserted.source_file_name,
          status: inserted.status,
          createdAt: inserted.created_at,
          schema: inserted.schema_json,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna no upload do formulario.', details)
  }
}

