import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { normalizeCnpj, isValidCnpjFormat } from '@/lib/auth/cnpj'
import type { FormTemplateSchema } from '@/lib/forms/parser'
import { validateSubmissionAnswers } from '@/lib/forms/runtime'

type ApiErrorCode = 'INVALID_JSON' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR'

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

export async function POST(
  request: Request,
  context: { params: { templateId: string } }
): Promise<NextResponse> {
  try {
    const templateId = (context.params.templateId ?? '').trim()
    if (!templateId) {
      return errorResponse(422, 'VALIDATION_ERROR', 'templateId obrigatorio.')
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
    const respondentName = asTrimmed(payload.respondentName)
    const respondentEmail = asTrimmed(payload.respondentEmail).toLowerCase()
    const answersRaw = payload.answers

    if (!isValidCnpjFormat(cnpj)) {
      return errorResponse(422, 'VALIDATION_ERROR', 'CNPJ invalido.')
    }
    if (!answersRaw || typeof answersRaw !== 'object' || Array.isArray(answersRaw)) {
      return errorResponse(422, 'VALIDATION_ERROR', 'answers deve ser um objeto.')
    }
    if (respondentEmail && !respondentEmail.includes('@')) {
      return errorResponse(422, 'VALIDATION_ERROR', 'E-mail do respondente invalido.')
    }

    const admin = getSupabaseAdminClient()
    const { data: templateData, error: templateError } = await admin
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

    if (templateError || !templateData?.id) {
      return errorResponse(404, 'NOT_FOUND', 'Template nao encontrado para este CNPJ.')
    }

    const schema = templateData.schema_json as FormTemplateSchema
    if (!schema || !Array.isArray(schema.fields)) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Schema do template invalido.')
    }

    const validated = validateSubmissionAnswers(schema, answersRaw as Record<string, unknown>)
    if (!validated.success) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Respostas invalidas.', validated.errors)
    }

    const { data: inserted, error: insertError } = await admin
      .from('company_form_submissions')
      .insert({
        template_id: templateData.id,
        company_id: templateData.company_id,
        respondent_name: respondentName || null,
        respondent_email: respondentEmail || null,
        answers_json: validated.normalizedAnswers,
      })
      .select('id, created_at')
      .single()

    if (insertError || !inserted?.id) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao salvar respostas.')
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          submissionId: inserted.id,
          submittedAt: inserted.created_at,
          templateName: templateData.template_name,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao enviar formulario.', details)
  }
}

