'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

function shouldRedirectToReset(hash: string): boolean {
  if (!hash) return false
  return hash.includes('type=recovery') || hash.includes('access_token=') || hash.includes('error_code=otp_expired')
}

export default function RecoveryHashRedirect(): null {
  const router = useRouter()

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (!shouldRedirectToReset(hash)) {
      return
    }

    router.replace(`/auth/reset-password${hash}`)
  }, [router])

  return null
}
