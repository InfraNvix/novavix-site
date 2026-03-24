import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getClientIp } from '@/lib/security/http'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { parseSyncPayload } from '@/lib/validators/sync'

type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'TOO_MANY_REQUESTS'
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'CONFIG_ERROR'
  | 'DATABASE_ERROR'
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

function secureCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }
  return timingSafeEqual(leftBuffer, rightBuffer)
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ip = getClientIp(request)
    const rateLimit = checkRateLimit(`sync:${ip}`, { limit: 40, windowMs: 60_000 })
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

    const expectedApiKey = process.env.NOVAVIX_SYNC_API_KEY
    if (!expectedApiKey) {
      return errorResponse(500, 'CONFIG_ERROR', 'Sync endpoint is not configured.')
    }

    const providedApiKey = request.headers.get('x-api-key')
    if (!providedApiKey || !secureCompare(providedApiKey, expectedApiKey)) {
      return errorResponse(401, 'UNAUTHORIZED', 'Invalid API key.')
    }

    const contentLength = Number(request.headers.get('content-length') ?? '0')
    if (Number.isFinite(contentLength) && contentLength > 30_000) {
      return errorResponse(413, 'VALIDATION_ERROR', 'Payload too large.')
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON.')
    }

    const parsed = parseSyncPayload(body)
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Payload validation failed.', parsed.errors)
    }

    const supabase = getSupabaseAdminClient()
    const { error } = await supabase.from('documentos').insert([parsed.data])

    if (error) {
      return errorResponse(500, 'DATABASE_ERROR', 'Could not persist sync payload.')
    }

    return NextResponse.json(
      {
        ok: true,
        message: 'Sincronizado com sucesso',
      },
      { status: 200 }
    )
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', 'Unexpected error while processing sync.')
  }
}
