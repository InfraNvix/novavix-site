import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { canAccessCompanyScope, resolveCopsoqAccessContext } from '@/lib/copsoq/auth/access'
import { getImportJobById } from '@/lib/imports/repositories/import-job-repository'
import { processImportCommit } from '@/lib/imports/services/process-import-commit'
import { writeImportAuditEvent } from '@/lib/imports/services/audit'
import { parseImportCommitPayload } from '@/lib/validators/import-commit'

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

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request)

  try {
    const access = await resolveCopsoqAccessContext(request)
    if (!access) {
      await writeImportAuditEvent({
        eventName: 'imports.commit',
        eventStatus: 'denied',
        actorMode: 'system',
        endpoint: '/api/imports/commit',
        httpMethod: 'POST',
        ip,
        errorCode: 'UNAUTHORIZED',
      })
      return errorResponse(401, 'UNAUTHORIZED', 'Acesso nao autorizado para commit de importacao.')
    }

    const rateLimit = await checkRateLimit(`imports-commit:${ip}`, { limit: 40, windowMs: 60_000 })
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Body precisa ser JSON valido.')
    }

    const parsed = parseImportCommitPayload(body)
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Dados de commit invalidos.', parsed.errors)
    }

    const job = await getImportJobById(parsed.data.importJobId)
    if (!job) {
      return errorResponse(404, 'DOMAIN_ERROR', 'Job de importacao nao encontrado.', ['IMPORT_JOB_NOT_FOUND'])
    }

    if (!canAccessCompanyScope(access, job.companyId)) {
      await writeImportAuditEvent({
        eventName: 'imports.commit',
        eventStatus: 'denied',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId: job.companyId,
        jobId: job.id,
        endpoint: '/api/imports/commit',
        httpMethod: 'POST',
        ip,
        errorCode: 'FORBIDDEN_SCOPE',
      })
      return errorResponse(403, 'FORBIDDEN', 'Sem permissao para confirmar importacao desta empresa.')
    }

    if (job.entityType !== 'collaborators') {
      return errorResponse(422, 'DOMAIN_ERROR', 'Entidade ainda nao habilitada para commit nesta fase.', ['IMPORT_ENTITY_NOT_ENABLED'])
    }

    const result = await processImportCommit({
      importJobId: parsed.data.importJobId,
      mapping: parsed.data.mapping,
      conflictStrategy: parsed.data.conflictStrategy,
    })

    await writeImportAuditEvent({
      eventName: 'imports.commit',
      eventStatus: 'success',
      actorMode: access.mode,
      actorRole: access.role,
      actorUserId: access.userId,
      actorEmail: access.loginEmail,
      companyId: job.companyId,
      jobId: job.id,
      endpoint: '/api/imports/commit',
      httpMethod: 'POST',
      ip,
      payloadMeta: {
        conflictStrategy: parsed.data.conflictStrategy,
      },
    })

    return NextResponse.json({ ok: true, data: result }, { status: 200 })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'IMPORT_COMMIT_INTERNAL_ERROR'
    if (code === 'IMPORT_PREVIEW_DATA_MISSING' || code === 'IMPORT_REQUIRED_FIELD_UNMAPPED') {
      return errorResponse(422, 'DOMAIN_ERROR', 'Dados de preview incompletos para commit.', [code])
    }
    if (code === 'IMPORT_JOB_NOT_FOUND') {
      return errorResponse(404, 'DOMAIN_ERROR', 'Job de importacao nao encontrado.', [code])
    }

    await writeImportAuditEvent({
      eventName: 'imports.commit',
      eventStatus: 'failure',
      actorMode: 'system',
      endpoint: '/api/imports/commit',
      httpMethod: 'POST',
      ip,
      errorCode: code,
    })
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao confirmar importacao.', [code])
  }
}

