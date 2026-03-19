'use client';

import { NextStudio } from 'next-sanity/studio';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Forçamos o import a ser feito APENAS no navegador, 
// escondendo o caminho do arquivo do compilador de build do servidor.
const AdminStudio = dynamic(
  () => import('../../../../sanity.config').then((mod) => {
    return (props: any) => <NextStudio config={mod.default} {...props} />;
  }),
  { ssr: false }
);

export default function AdminPage() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-auto">
      <Suspense fallback={
        <div className="min-h-screen bg-white flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">
          Iniciando Novavix Admin...
        </div>
      }>
        <AdminStudio />
      </Suspense>
    </div>
  );
}
