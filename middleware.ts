import { NextResponse, type NextRequest } from 'next/server'
import {
  DEFAULT_AUTH_REDIRECT,
  isAdminRoute,
  isAuthPage,
  isClinicRoute,
  isCompanyRoute,
  isProtectedRoute,
  isStaticAsset,
} from './lib/auth/guards'
import { updateSession } from './lib/supabase/middleware'
import { isUserRole, type UserRole } from './lib/auth/roles'
import { applyCorsHeaders, applySecurityHeaders } from './lib/security/http'
import { validateRequiredEnv } from './lib/env/required'

function applyHttpHeaders(target: NextResponse, request: NextRequest): NextResponse {
  const withSecurity = applySecurityHeaders(target)
  const withCors = applyCorsHeaders(withSecurity, request)
  if (isAuthPage(request.nextUrl.pathname)) {
    withCors.headers.set('Cache-Control', 'no-store')
  }
  return withCors
}

function withSessionCookies(source: NextResponse, target: NextResponse, request: NextRequest): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie)
  }
  return applyHttpHeaders(target, request)
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  validateRequiredEnv()

  const { pathname, search } = request.nextUrl

  if (request.method === 'OPTIONS' && pathname.startsWith('/api')) {
    return applyHttpHeaders(new NextResponse(null, { status: 204 }), request)
  }

  if (isStaticAsset(pathname)) {
    return applyHttpHeaders(NextResponse.next(), request)
  }

  const needsSessionCheck = isProtectedRoute(pathname) || isAuthPage(pathname)
  if (!needsSessionCheck) {
    return applyHttpHeaders(NextResponse.next(), request)
  }

  const { supabase, response } = updateSession(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isProtectedRoute(pathname) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', `${pathname}${search}`)
    return withSessionCookies(response, NextResponse.redirect(loginUrl), request)
  }

  let role: UserRole | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    role = isUserRole(profile?.role) ? profile.role : null
  }

  if (user && isAdminRoute(pathname) && role !== 'admin') {
    const target = request.nextUrl.clone()
    target.pathname = role === 'clinica' ? '/clinic' : DEFAULT_AUTH_REDIRECT
    target.search = ''
    return withSessionCookies(response, NextResponse.redirect(target), request)
  }

  if (user && isClinicRoute(pathname) && role !== 'clinica' && role !== 'admin') {
    const target = request.nextUrl.clone()
    target.pathname = DEFAULT_AUTH_REDIRECT
    target.search = ''
    return withSessionCookies(response, NextResponse.redirect(target), request)
  }

  if (user && isCompanyRoute(pathname) && role === 'clinica') {
    const adminUrl = request.nextUrl.clone()
    adminUrl.pathname = '/clinic'
    adminUrl.search = ''
    return withSessionCookies(response, NextResponse.redirect(adminUrl), request)
  }

  return applyHttpHeaders(response, request)
}

export const config = {
  matcher: ['/api/:path*', '/login', '/dashboard/:path*', '/portal/:path*', '/admin/:path*', '/clinic/:path*'],
}
