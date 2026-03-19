'use client'

import { NextStudio } from 'next-sanity/studio'

export default function Studio({ config }: { config: any }) {
  return <NextStudio config={config} />
}
