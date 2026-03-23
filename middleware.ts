import { NextResponse, type NextRequest } from 'next/server'
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

function withSessionCookies(source: NextResponse, target: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie)
  }
  return target
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl

  if (isStaticAsset(pathname)) {
    return NextResponse.next()
  }

  const needsSessionCheck = isProtectedRoute(pathname) || isAuthPage(pathname)
  if (!needsSessionCheck) {
    return NextResponse.next()
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

  return response
}

export const config = {
  matcher: ['/login', '/dashboard/:path*', '/portal/:path*', '/admin/:path*'],
}
