'use client'

import { NextStudio } from 'next-sanity/studio'
import type { Config } from 'sanity'

export default function Studio({ config }: { config: Config }) {
  return <NextStudio config={config} />
}
