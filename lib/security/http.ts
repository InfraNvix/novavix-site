import type { NextRequest, NextResponse } from 'next/server'

export function getClientIp(request: Request | NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
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
      ? "script-src 'self' 'unsafe-inline' https:"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:"

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
