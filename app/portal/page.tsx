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
    const carregarDadosPortal = async () => {
      // 1. Pega o usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 2. Busca o CNPJ do perfil
      const { data: pData } = await supabase
        .from('perfis')
        .select('cnpj, nome_empresa')
        .eq('id', user.id)
        .single();

      if (pData) {
        setPerfil(pData);
        // 3. Busca documentos desse CNPJ
        const { data: docs } = await supabase
          .from('documentos')
          .select('*')
          .eq('cnpj', pData.cnpj)
          .order('created_at', { ascending: false });
        
        setDocumentos(docs || []);
      }
      setLoading(false);
    };

    carregarDadosPortal();
  }, [router]);

  const handleDownload = async (fileName: string) => {
    const { data, error } = await supabase.storage
      .from('documentos')
      .createSignedUrl(fileName, 60);

    if (error) {
      alert('Erro ao gerar link de download');
      return;
    }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400 font-medium">
        Carregando seus documentos...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Topbar */}
      <nav className="bg-white border-b border-slate-100 p-6 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <span className="font-black text-2xl text-slate-800 tracking-tighter">NOVAVIX</span>
          <button 
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 px-5 py-2 rounded-full font-bold transition-all text-sm"
          >
            Sair do Portal
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-slate-900 mb-2">Olá, {perfil?.nome_empresa || 'Cliente'}</h1>
          <p className="text-slate-500 font-medium text-lg">Central de Laudos - CNPJ: {perfil?.cnpj}</p>
        </header>

        <div className="grid gap-5">
          {documentos.length > 0 ? documentos.map((doc) => (
            <div key={doc.id} className="bg-white p-7 rounded-[28px] shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center hover:shadow-xl hover:scale-[1.01] transition-all">
              <div className="text-center sm:text-left mb-4 sm:mb-0">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-teal-600 bg-teal-50 px-4 py-1.5 rounded-full inline-block">
                  {doc.tipo_documento}
                </span>
                <h3 className="text-xl font-bold text-slate-800 mt-3">Documentação Técnica SST</h3>
                <p className="text-slate-400 text-sm font-medium">Data de emissão: {new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <button 
                onClick={() => handleDownload(doc.url_pdf)}
                className="w-full sm:w-auto bg-slate-900 hover:bg-teal-600 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-slate-200"
              >
                Abrir Laudo PDF
              </button>
            </div>
          )) : (
            <div className="bg-white p-24 rounded-[40px] border-2 border-dashed border-slate-200 text-center">
              <p className="text-slate-400 font-bold text-xl">Nenhum documento disponível para este CNPJ ainda.</p>
              <p className="text-slate-300 mt-2 italic text-sm">Entre em contato com o suporte se houver dúvidas.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
