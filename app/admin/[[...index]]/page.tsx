'use client';

import dynamic from 'next/dynamic';

// Importação dinâmica com proteção total contra SSR
const NextStudio = dynamic(
  () => import('next-sanity/studio').then((mod) => mod.NextStudio),
  { 
    ssr: false,
    loading: () => <div className="min-h-screen bg-white flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-xs animate-pulse">Carregando Novavix Admin...</div>
  }
);

// Importamos o config dentro do componente para evitar que ele seja processado no topo do arquivo
export default function AdminPage() {
  const config = require('../../../../sanity.config').default;

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-auto">
      <NextStudio config={config} />
    </div>
  );
}
