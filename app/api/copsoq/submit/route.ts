import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getCopsoqClassificationLabel } from '@/lib/copsoq/scoring/classification'
import { processCopsoqIndividualSubmission } from '@/lib/copsoq/services/process-individual-submission'
import { writeCopsoqAuditEvent } from '@/lib/copsoq/services/audit'
import { parseCopsoqSubmissionPayload } from '@/lib/validators/copsoq-submit'
import { canAccessCompanyScope, resolveCopsoqAccessContext } from '@/lib/copsoq/auth/access'

type ApiErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'TOO_MANY_REQUESTS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'DOMAIN_ERROR'
  | 'INTERNAL_ERROR'

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: string[],
  headers?: Record<string, string>
): NextResponse {
  const response = NextResponse.json(
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

  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value)
    }
  }

  return response
}

function mapDomainError(errorCode: string): { status: number; message: string } {
  switch (errorCode) {
    case 'COPSOQ_CATALOG_NOT_FOUND':
      return { status: 404, message: 'Catalogo COPSOQ nao encontrado para a versao informada.' }
    case 'COPSOQ_INVALID_ANSWER_COUNT':
    case 'COPSOQ_DUPLICATE_ANSWER_NUMBER':
    case 'COPSOQ_ANSWER_NOT_IN_CATALOG':
    case 'COPSOQ_ANSWER_SCORING_INCOMPLETE':
    case 'COPSOQ_CATALOG_QUESTION_COUNT_MISMATCH':
      return { status: 422, message: 'Respostas invalidas para processamento COPSOQ.' }
    default:
      return { status: 500, message: 'Falha ao processar submissao COPSOQ.' }
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request)

  try {
    const access = await resolveCopsoqAccessContext(request)
    if (!access || !access.canReadIndividual) {
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.submit.individual',
        eventStatus: 'denied',
        actorMode: access?.mode ?? 'system',
        actorRole: access?.role ?? null,
        actorUserId: access?.userId ?? null,
        actorEmail: access?.loginEmail ?? null,
        endpoint: '/api/copsoq/submit',
        httpMethod: 'POST',
        ip,
        errorCode: 'UNAUTHORIZED',
      })
      return errorResponse(401, 'UNAUTHORIZED', 'Acesso nao autorizado ao processamento individual COPSOQ.')
    }

    const rateLimit = await checkRateLimit(`copsoq-submit:${ip}`, { limit: 60, windowMs: 60_000 })
    if (!rateLimit.allowed) {
      return errorResponse(
        429,
        'TOO_MANY_REQUESTS',
        'Rate limit exceeded.',
        [],
        {
          'Retry-After': String(rateLimit.retryAfterSec),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        }
      )
    }

    const contentLength = Number(request.headers.get('content-length') ?? '0')
    if (Number.isFinite(contentLength) && contentLength > 100_000) {
      return errorResponse(413, 'VALIDATION_ERROR', 'Payload too large.')
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Body precisa ser JSON valido.')
    }

    const parsed = parseCopsoqSubmissionPayload(body)
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Dados de submissao invalidos.', parsed.errors)
    }

    if (!canAccessCompanyScope(access, parsed.data.companyId)) {
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.submit.individual',
        eventStatus: 'denied',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId: parsed.data.companyId,
        endpoint: '/api/copsoq/submit',
        httpMethod: 'POST',
        ip,
        errorCode: 'FORBIDDEN_SCOPE',
      })
      return errorResponse(403, 'FORBIDDEN', 'Sem permissao para processar dados desta empresa.')
    }

    try {
      const result = await processCopsoqIndividualSubmission(parsed.data)
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.submit.individual',
        eventStatus: 'success',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId: parsed.data.companyId,
        sessionId: result.sessionId,
        endpoint: '/api/copsoq/submit',
        httpMethod: 'POST',
        ip,
      })

      return NextResponse.json(
        {
          ok: true,
          data: {
            sessionId: result.sessionId,
            questionnaireCode: result.questionnaireCode,
            submittedAt: result.submittedAt,
            processedAt: result.processedAt,
            dimensions: result.dimensions.map((dimension) => ({
              dimensionCode: dimension.dimensionCode,
              dimensionName: dimension.dimensionName,
              score: dimension.score,
              classification: dimension.classification,
              classificationLabel: getCopsoqClassificationLabel(dimension.classification),
            })),
          },
        },
        { status: 201 }
      )
    } catch (error) {
      const code = error instanceof Error ? error.message : 'COPSOQ_UNKNOWN_ERROR'
      const mapped = mapDomainError(code)
      await writeCopsoqAuditEvent({
        eventName: 'copsoq.submit.individual',
        eventStatus: 'failure',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId: parsed.data.companyId,
        endpoint: '/api/copsoq/submit',
        httpMethod: 'POST',
        ip,
        errorCode: code,
      })
      return errorResponse(mapped.status, 'DOMAIN_ERROR', mapped.message, [code])
    }
  } catch {
    await writeCopsoqAuditEvent({
      eventName: 'copsoq.submit.individual',
      eventStatus: 'failure',
      actorMode: 'system',
      endpoint: '/api/copsoq/submit',
      httpMethod: 'POST',
      ip,
      errorCode: 'INTERNAL_ERROR',
    })
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao processar submissao COPSOQ.')
  }
}
