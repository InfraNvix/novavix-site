import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { parseCsvTemplate, parseJsonTemplate, parseXlsxTemplate } from '@/lib/forms/parser'
import { backupTemplateToSupabase, getProfileMongoFirst, insertTemplateMongo } from '@/lib/mongodb/primary-store'

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

    const profile = await getProfileMongoFirst(user.id)

    if (!profile?.is_active) {
      return errorResponse(403, 'FORBIDDEN', 'Perfil inativo.')
    }

    if (profile.role !== 'admin' && profile.role !== 'tecnico') {
      return errorResponse(403, 'FORBIDDEN', 'Acesso restrito ao admin.')
    }

    const formData = await request.formData()
    const templateName = asText(formData.get('templateName'))
    const file = formData.get('file')

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

    const templateId = randomUUID()
    const createdAt = new Date().toISOString()
    await insertTemplateMongo({
      id: templateId,
      company_id: null,
      template_name: templateName,
      source_format: format,
      source_file_name: file.name,
      schema_json: schema,
      status: 'active',
      uploaded_by_user_id: user.id,
    })
    await backupTemplateToSupabase({
      id: templateId,
      company_id: null,
      template_name: templateName,
      source_format: format,
      source_file_name: file.name,
      schema_json: schema,
      status: 'active',
      uploaded_by_user_id: user.id,
    })

    return NextResponse.json(
      {
        ok: true,
        data: {
          id: templateId,
          templateName,
          sourceFormat: format,
          sourceFileName: file.name,
          status: 'active',
          createdAt,
          schema,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna no upload do formulario.', details)
  }
}

