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
    const collaboratorId = asTrimmed(payload.collaboratorId)
    const collaboratorExternalEmployeeId = asTrimmed(payload.collaboratorExternalEmployeeId)
    const answersRaw = payload.answers

    if (!isValidCnpjFormat(cnpj)) {
      return errorResponse(422, 'VALIDATION_ERROR', 'CNPJ invalido.')
    }
    if (!collaboratorId && !collaboratorExternalEmployeeId) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Selecione o colaborador.')
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
        template_name,
        schema_json,
        status
      `
      )
      .eq('id', templateId)
      .eq('status', 'active')
      .maybeSingle()

    if (templateError || !templateData?.id) {
      return errorResponse(404, 'NOT_FOUND', 'Template nao encontrado.')
    }

    const schema = templateData.schema_json as FormTemplateSchema
    if (!schema || !Array.isArray(schema.fields)) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Schema do template invalido.')
    }

    const validated = validateSubmissionAnswers(schema, answersRaw as Record<string, unknown>)
    if (!validated.success) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Respostas invalidas.', validated.errors)
    }

    const { data: company, error: companyError } = await admin
      .from('companies')
      .select('id, cnpj, status')
      .eq('cnpj', cnpj)
      .eq('status', 'active')
      .maybeSingle()

    if (companyError || !company?.id) {
      return errorResponse(404, 'NOT_FOUND', 'Empresa nao encontrada para este CNPJ.')
    }

    let collaboratorQuery = admin
      .from('copsoq_collaborators')
      .select('id, external_employee_id, full_name, is_active, company_id')
      .eq('company_id', company.id)

    if (collaboratorId) {
      collaboratorQuery = collaboratorQuery.eq('id', collaboratorId)
    } else {
      collaboratorQuery = collaboratorQuery.eq('external_employee_id', collaboratorExternalEmployeeId)
    }

    const { data: collaborator, error: collaboratorError } = await collaboratorQuery.maybeSingle()
    if (collaboratorError || !collaborator?.id || !collaborator.is_active) {
      return errorResponse(404, 'NOT_FOUND', 'Colaborador nao encontrado.')
    }

    const { data: inserted, error: insertError } = await admin
      .from('company_form_submissions')
      .insert({
        template_id: templateData.id,
        company_id: company.id,
        collaborator_id: collaborator.id,
        collaborator_external_employee_id: collaborator.external_employee_id ?? null,
        collaborator_name: collaborator.full_name ?? null,
        respondent_name: respondentName || collaborator.full_name || null,
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
