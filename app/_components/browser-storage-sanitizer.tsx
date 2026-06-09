'use client'

import { useEffect } from 'react'
import { purgeSensitiveBrowserStorage } from '@/lib/security/browser-storage'

export default function BrowserStorageSanitizer(): null {
  useEffect(() => {
    purgeSensitiveBrowserStorage()
  }, [])

  return null
}
