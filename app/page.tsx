'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function PortalPage() {
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const carregarDados = async () => {
      // 1. Verifica se está logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 2. Busca o CNPJ vinculado na tabela perfis
      const { data: pData } = await supabase
        .from('perfis')
        .select('cnpj, nome_empresa')
        .eq('id', user.id)
        .single();

      if (pData) {
        setPerfil(pData);
        // 3. Busca os documentos desse CNPJ
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
    // Gera link temporário de 60 segundos para o arquivo privado
    const { data } = await supabase.storage
      .from('documentos')
      .createSignedUrl(fileName, 60);

    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-500">Carregando portal...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b p-4 mb-8">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <span className="font-bold text-teal-700 text-xl">NOVAVIX PORTAL</span>
          <button 
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="text-slate-500 hover:text-red-500 font-medium"
          >
            Sair do Portal
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Bem-vindo, {perfil?.nome_empresa}</h1>
          <p className="text-slate-500">Documentos disponíveis para o CNPJ: {perfil?.cnpj}</p>
        </header>

        <div className="grid gap-4">
          {documentos.length > 0 ? documentos.map((doc) => (
            <div key={doc.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 hover:shadow-md transition">
              <div>
                <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-full uppercase tracking-wider">{doc.tipo_documento}</span>
                <h3 className="text-lg font-bold text-slate-700 mt-1">Laudo Técnico de SST</h3>
                <p className="text-sm text-slate-400">Publicado em: {new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <button 
                onClick={() => handleDownload(doc.url_pdf)}
                className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition"
              >
                Baixar PDF
              </button>
            </div>
          )) : (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
              <p className="text-slate-400">Nenhum documento disponível para este CNPJ ainda.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
