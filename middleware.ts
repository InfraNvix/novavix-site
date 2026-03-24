import { NextResponse, type NextRequest } from 'next/server'
import {
  DEMO_AUTH_COOKIE_NAME,
  DEMO_MODE_ENABLED,
  getDemoRoleFromCookieValue,
} from './lib/auth/demo'
import {
  DEFAULT_AUTH_REDIRECT,
  isAdminRoute,
  isAuthPage,
  isCompanyRoute,
  isProtectedRoute,
  isStaticAsset,
} from './lib/auth/guards'
import { updateSession } from './lib/supabase/middleware'
import { isUserRole, type UserRole } from './lib/auth/roles'
import { applySecurityHeaders } from './lib/security/http'

function withSessionCookies(source: NextResponse, target: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie)
  }
  return applySecurityHeaders(target)
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl

  if (isStaticAsset(pathname)) {
    return applySecurityHeaders(NextResponse.next())
  }

  const needsSessionCheck = isProtectedRoute(pathname) || isAuthPage(pathname)
  if (!needsSessionCheck) {
    return applySecurityHeaders(NextResponse.next())
  }

  if (DEMO_MODE_ENABLED) {
    const demoRole = getDemoRoleFromCookieValue(request.cookies.get(DEMO_AUTH_COOKIE_NAME)?.value)

    if (isProtectedRoute(pathname) && !demoRole) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', `${pathname}${search}`)
      return applySecurityHeaders(NextResponse.redirect(loginUrl))
    }

    if (demoRole && isAdminRoute(pathname) && demoRole !== 'admin') {
      const companyUrl = request.nextUrl.clone()
      companyUrl.pathname = DEFAULT_AUTH_REDIRECT
      companyUrl.search = ''
      return applySecurityHeaders(NextResponse.redirect(companyUrl))
    }

    if (demoRole && isCompanyRoute(pathname) && demoRole === 'admin') {
      const adminUrl = request.nextUrl.clone()
      adminUrl.pathname = '/admin'
      adminUrl.search = ''
      return applySecurityHeaders(NextResponse.redirect(adminUrl))
    }

    if (isAuthPage(pathname) && demoRole) {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = demoRole === 'admin' ? '/admin' : DEFAULT_AUTH_REDIRECT
      dashboardUrl.search = ''
      return applySecurityHeaders(NextResponse.redirect(dashboardUrl))
    }

    return applySecurityHeaders(NextResponse.next())
  }

  const { supabase, response } = updateSession(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isProtectedRoute(pathname) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', `${pathname}${search}`)
    return withSessionCookies(response, NextResponse.redirect(loginUrl))
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
    const companyUrl = request.nextUrl.clone()
    companyUrl.pathname = DEFAULT_AUTH_REDIRECT
    companyUrl.search = ''
    return withSessionCookies(response, NextResponse.redirect(companyUrl))
  }

  if (user && isCompanyRoute(pathname) && role === 'admin') {
    const adminUrl = request.nextUrl.clone()
    adminUrl.pathname = '/admin'
    adminUrl.search = ''
    return withSessionCookies(response, NextResponse.redirect(adminUrl))
  }

  if (isAuthPage(pathname) && user) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = role === 'admin' ? '/admin' : DEFAULT_AUTH_REDIRECT
    dashboardUrl.search = ''
    return withSessionCookies(response, NextResponse.redirect(dashboardUrl))
  }

  return applySecurityHeaders(response)
}

export const config = {
  matcher: ['/login', '/dashboard/:path*', '/portal/:path*', '/admin/:path*'],
}
