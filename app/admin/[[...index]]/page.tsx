'use client'
'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const AdminStudio = dynamic(
  async () => {
    // Importamos o config e o componente Studio apenas no lado do cliente
    const config = (await import('../../../../sanity.config')).default;
    const Studio = (await import('./Studio')).default;
    
    return () => <Studio config={config} />;
  },
  { 
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-white flex items-center justify-center font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">
        Iniciando Novavix Admin...
      </div>
    )
  }
);

export default function AdminPage() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-auto">
      <Suspense fallback={null}>
        <AdminStudio />
      </Suspense>
    </div>
  )
}
