import type { NextRequest, NextResponse } from 'next/server'

export function getClientIp(request: Request | NextRequest): string {
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return 'unknown'
}

export function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  const scriptSrc =
    process.env.NODE_ENV === 'production'
      ? "script-src 'self'"
      : "script-src 'self' 'unsafe-eval'"

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https:",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https:",
      scriptSrc,
    ].join('; ')
  )

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  return response
}

export function applyCorsHeaders(response: NextResponse, request: Request | NextRequest): NextResponse {
  const frontendUrl = process.env.FRONTEND_URL?.trim()
  const requestOrigin = request.headers.get('origin')?.trim()

  if (!frontendUrl) {
    return response
  }

  response.headers.set('Vary', 'Origin')
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
  response.headers.set('Access-Control-Allow-Credentials', 'true')

  if (requestOrigin && requestOrigin === frontendUrl) {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin)
  } else {
    response.headers.set('Access-Control-Allow-Origin', frontendUrl)
  }

  return response
}
