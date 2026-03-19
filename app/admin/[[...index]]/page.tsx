'use client';

import dynamic from 'next/dynamic';

const NextStudio = dynamic(
  async () => {
    const { NextStudio } = await import('next-sanity/studio');
    const config = (await import('../../../../sanity.config.js')).default;
    return (props) => <NextStudio {...props} config={config} />;
  },
  { ssr: false }
);

export default function AdminPage() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-auto">
      <NextStudio />
    </div>
  );
}
