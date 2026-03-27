import { NextResponse } from 'next/server'
import type { CopsoqAccessContext } from '@/lib/copsoq/auth/access'

export type AnalyticsApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'TOO_MANY_REQUESTS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'DOMAIN_ERROR'
  | 'INTERNAL_ERROR'

export function analyticsErrorResponse(
  status: number,
  code: AnalyticsApiErrorCode,
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

export function resolveAnalyticsCompanyId(
  access: CopsoqAccessContext,
  requestedCompanyId?: string | null
): string | null {
  if (access.mode === 'user' && access.role === 'empresa') {
    return access.companyId
  }

  return requestedCompanyId ?? access.companyId ?? null
}
