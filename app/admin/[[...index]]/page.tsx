'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Importação dinâmica do componente Studio sem SSR
const Studio = dynamic(() => import('./Studio'), { 
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-white flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">
      Iniciando Painel Novavix...
    </div>
  )
})

export default function AdminPage() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white">
      <Suspense fallback={null}>
        <Studio />
      </Suspense>
    </div>
  )
}
