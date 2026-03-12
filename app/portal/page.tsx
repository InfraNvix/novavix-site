'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function PortalPage() {
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const carregarDados = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: pData } = await supabase
        .from('perfis')
        .select('cnpj, nome_empresa')
        .eq('id', user.id)
        .single();

      if (pData) {
        setPerfil(pData);
        const { data: docs } = await supabase
          .from('documentos')
          .select('*')
          .eq('cnpj', pData.cnpj)
          .order('created_at', { ascending: false });
        setDocumentos(docs || []);
      }
      setLoading(false);
    };
    carregarDados();
  }, [router]);

  const handleDownload = async (fileName: string) => {
    const { data } = await supabase.storage
      .from('documentos')
      .createSignedUrl(fileName, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Carregando portal...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Olá, {perfil?.nome_empresa}</h1>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-red-500">Sair</button>
        </div>
        <div className="grid gap-4">
          {documentos.map((doc) => (
            <div key={doc.id} className="bg-white p-6 rounded-xl shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-bold">{doc.tipo_documento}</h3>
                <p className="text-sm text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => handleDownload(doc.url_pdf)} className="bg-teal-600 text-white px-4 py-2 rounded-lg">Download</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
