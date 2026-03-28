import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { DEMO_MODE_ENABLED, getDemoCookieConfig } from '@/lib/auth/demo'

function getPublicEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const loginUrl = new URL('/login', request.url)
  const response = NextResponse.redirect(loginUrl)

  if (DEMO_MODE_ENABLED) {
    const config = getDemoCookieConfig()
    response.cookies.set({
      name: config.name,
      value: '',
      httpOnly: config.httpOnly,
      sameSite: config.sameSite,
      secure: config.secure,
      path: config.path,
      maxAge: 0,
    })
    return response
  }

  const supabase = createServerClient(
    getPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  await supabase.auth.signOut()
  return response
}

