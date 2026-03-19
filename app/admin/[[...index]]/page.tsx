'use client';

import { NextStudio } from 'next-sanity/studio';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Importação dinâmica do config para isolar o build
const AdminStudio = dynamic(
  async () => {
    const config = (await import('../../../../sanity.config')).default;
    return () => <NextStudio config={config} />;
  },
  { ssr: false }
);

export default function AdminPage() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-auto">
      <Suspense fallback={
        <div className="min-h-screen bg-white flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">
          Carregando Painel Novavix...
        </div>
      }>
        <AdminStudio />
      </Suspense>
    </div>
  );
}
