const COMPANY_PREFIXES = ['/dashboard', '/portal']
const ADMIN_PREFIXES = ['/admin']
const AUTH_PAGES = ['/login']
const STATIC_PREFIXES = ['/_next', '/favicon.ico', '/robots.txt', '/sitemap.xml']

export const DEFAULT_AUTH_REDIRECT = '/dashboard'

export function isStaticAsset(pathname: string): boolean {
  return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function isProtectedRoute(pathname: string): boolean {
  return [...COMPANY_PREFIXES, ...ADMIN_PREFIXES].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function isCompanyRoute(pathname: string): boolean {
  return COMPANY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}
