import { NextResponse } from 'next/server'
import { DEMO_MODE_ENABLED, getDemoCookieConfig } from '@/lib/auth/demo'

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true }, { status: 200 })
  if (!DEMO_MODE_ENABLED) {
    return response
  }

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
