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

  if (loading) return <div className="flex min-h-screen items-center justify-center font-medium text-slate-500">Carregando portal...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Olá, {perfil?.nome_empresa}</h1>
            <p className="text-sm text-slate-500">CNPJ: {perfil?.cnpj}</p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="text-red-500 font-semibold hover:underline"
          >
            Sair
          </button>
        </header>

        <div className="grid gap-4">
          {documentos.length > 0 ? documentos.map((doc) => (
            <div key={doc.id} className="bg-white p-6 rounded-2xl shadow-sm flex justify-between items-center border border-slate-100 hover:shadow-md transition">
              <div>
                <h3 className="font-bold text-slate-700">{doc.tipo_documento}</h3>
                <p className="text-sm text-slate-400">Publicado em: {new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <button 
                onClick={() => handleDownload(doc.url_pdf)}
                className="bg-teal-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-teal-700 transition"
              >
                Download PDF
              </button>
            </div>
          )) : (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400">Nenhum documento disponível no momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
