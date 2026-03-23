import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { parseSyncPayload } from '@/lib/validators/sync'

type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'CONFIG_ERROR'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: string[]
): NextResponse {
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

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const expectedApiKey = process.env.NOVAVIX_SYNC_API_KEY
    if (!expectedApiKey) {
      return errorResponse(500, 'CONFIG_ERROR', 'Sync endpoint is not configured.')
    }

    const providedApiKey = request.headers.get('x-api-key')
    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      return errorResponse(401, 'UNAUTHORIZED', 'Invalid API key.')
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
      return errorResponse(500, 'DATABASE_ERROR', 'Could not persist sync payload.', [
        error.message,
      ])
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

