'use client';

import dynamic from 'next/dynamic';
import config from '../../../../sanity.config';

// Carrega o NextStudio apenas no lado do cliente (navegador)
const NextStudio = dynamic(
  () => import('next-sanity/studio').then((mod) => mod.NextStudio),
  { ssr: false }
);

export default function AdminPage() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white">
      <NextStudio config={config} />
    </div>
  );
}
