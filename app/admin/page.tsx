'use client'
import { NextStudio } from 'sanity/next-studio'
import config from '../../sanity.config' // Mudamos de @/ para ../../

export default function AdminPage() {
  return (
    <div style={{ height: '100vh' }}>
      <NextStudio config={config} />
    </div>
  )
}
