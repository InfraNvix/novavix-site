'use client'
import { NextStudio } from 'sanity/next-studio'
import config from '@/sanity.config' // Certifique-se que o sanity.config.ts está na raiz

export default function AdminPage() {
  return <NextStudio config={config} />
}
