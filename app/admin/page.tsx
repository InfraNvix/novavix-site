'use client';

import { NextStudio } from 'next-sanity/studio';
import config from '../../sanity.config';

export default function AdminPage() {
  return (
    <div className="min-h-screen">
      {/* O NextStudio renderiza todo o painel do Sanity aqui dentro */}
      <NextStudio config={config} />
    </div>
  );
}
