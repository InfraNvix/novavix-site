import { NextResponse } from 'next/server'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { canAccessCompanyScope, resolveCopsoqAccessContext } from '@/lib/copsoq/auth/access'
import { processImportPreview } from '@/lib/imports/services/process-import-preview'
import { writeImportAuditEvent } from '@/lib/imports/services/audit'
import { parseImportPreviewInput } from '@/lib/validators/import-preview'

type ApiErrorCode =
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

function resolveCompanyId(access: NonNullable<Awaited<ReturnType<typeof resolveCopsoqAccessContext>>>, requestedCompanyId?: string | null): string | null {
  if (access.mode === 'user' && access.role === 'empresa') {
    return access.companyId
  }

  return requestedCompanyId ?? access.companyId ?? null
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request)

  try {
    const access = await resolveCopsoqAccessContext(request)
    if (!access) {
      await writeImportAuditEvent({
        eventName: 'imports.preview',
        eventStatus: 'denied',
        actorMode: 'system',
        endpoint: '/api/imports/preview',
        httpMethod: 'POST',
        ip,
        errorCode: 'UNAUTHORIZED',
      })
      return errorResponse(401, 'UNAUTHORIZED', 'Acesso nao autorizado para preview de importacao.')
    }

    const rateLimit = await checkRateLimit(`imports-preview:${ip}`, { limit: 40, windowMs: 60_000 })
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

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Arquivo obrigatorio para preview.')
    }

    const parsed = parseImportPreviewInput({
      entityType: formData.get('entityType'),
      fileName: file instanceof File ? file.name : null,
      mimeType: file instanceof File ? file.type : null,
      sourceFormat: formData.get('sourceFormat'),
      requestedCompanyId: formData.get('companyId'),
      delimiter: formData.get('delimiter'),
      sheetName: formData.get('sheetName'),
      mapping: formData.get('mapping'),
    })

    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Dados de preview invalidos.', parsed.errors)
    }

    const companyId = resolveCompanyId(access, parsed.data.requestedCompanyId)
    if (!companyId) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Nao foi possivel resolver o companyId no contexto atual.')
    }

    if (!canAccessCompanyScope(access, companyId)) {
      await writeImportAuditEvent({
        eventName: 'imports.preview',
        eventStatus: 'denied',
        actorMode: access.mode,
        actorRole: access.role,
        actorUserId: access.userId,
        actorEmail: access.loginEmail,
        companyId,
        endpoint: '/api/imports/preview',
        httpMethod: 'POST',
        ip,
        errorCode: 'FORBIDDEN_SCOPE',
      })
      return errorResponse(403, 'FORBIDDEN', 'Sem permissao para importar dados desta empresa.')
    }

    let result
    try {
      result = await processImportPreview({
        entityType: parsed.data.entityType,
        companyId,
        actorMode: access.mode,
        actorUserId: access.userId,
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        sourceFormat: parsed.data.sourceFormat,
        delimiter: parsed.data.delimiter,
        sheetName: parsed.data.sheetName,
        mapping: parsed.data.mapping,
        fileBuffer: Buffer.from(await file.arrayBuffer()),
      })
    } catch (error) {
      const code = error instanceof Error ? error.message : 'IMPORT_PREVIEW_DOMAIN_ERROR'
      if (code === 'IMPORT_ENTITY_NOT_ENABLED') {
        return errorResponse(422, 'DOMAIN_ERROR', 'Entidade ainda nao habilitada para importacao nesta fase.', [code])
      }
      if (
        code === 'IMPORT_FILE_EMPTY' ||
        code === 'IMPORT_HEADER_INVALID' ||
        code === 'IMPORT_XLSX_EMPTY_WORKBOOK' ||
        code === 'IMPORT_XLSX_SHEET_NOT_FOUND'
      ) {
        return errorResponse(422, 'DOMAIN_ERROR', 'Arquivo invalido para preview de importacao.', [code])
      }
      throw error
    }

    await writeImportAuditEvent({
      eventName: 'imports.preview',
      eventStatus: 'success',
      actorMode: access.mode,
      actorRole: access.role,
      actorUserId: access.userId,
      actorEmail: access.loginEmail,
      companyId,
      jobId: result.importJobId,
      endpoint: '/api/imports/preview',
      httpMethod: 'POST',
      ip,
      payloadMeta: {
        entityType: parsed.data.entityType,
        sourceFormat: parsed.data.sourceFormat,
      },
    })

    return NextResponse.json({ ok: true, data: result }, { status: 201 })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'IMPORT_PREVIEW_INTERNAL_ERROR'
    await writeImportAuditEvent({
      eventName: 'imports.preview',
      eventStatus: 'failure',
      actorMode: 'system',
      endpoint: '/api/imports/preview',
      httpMethod: 'POST',
      ip,
      errorCode: code,
    })
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao processar preview de importacao.', [code])
  }
}
