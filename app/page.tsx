import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Portal() {
  const [documentos, setDocumentos] = useState([]);
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login'); // Se não estiver logado, vai para login
      } else {
        setUser(user);
        fetchPerfil(user.id);
      }
    };
    checkUser();
  }, []);

  const fetchPerfil = async (userId) => {
    const { data, error } = await supabase
      .from('perfis')
      .select('cnpj, nome_empresa')
      .eq('id', userId)
      .single();

    if (data) {
      setPerfil(data);
      fetchDocumentos(data.cnpj);
    }
  };

  const fetchDocumentos = async (cnpj) => {
    const { data } = await supabase
      .from('documentos')
      .select('*')
      .eq('cnpj', cnpj);
    setDocumentos(data || []);
  };

  const handleDownload = async (filePath) => {
    // Gera uma URL assinada (temporária) para o download seguro
    const { data, error } = await supabase.storage
      .from('documentos')
      .createSignedUrl(filePath, 60); // Link expira em 60 segundos

    if (data) window.open(data.signedUrl, '_blank');
  };

  if (!user || !perfil) return <p className="text-center p-10">Carregando...</p>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Olá, {perfil.nome_empresa}</h1>
            <p className="text-slate-500">CNPJ: {perfil.cnpj}</p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="text-red-500 hover:underline"
          >
            Sair
          </button>
        </div>

        <div className="grid gap-4">
          {documentos.length > 0 ? documentos.map((doc) => (
            <div key={doc.id} className="bg-white p-6 rounded-xl shadow-sm border flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-700">{doc.tipo_documento}</h3>
                <p className="text-sm text-slate-400 text-sm">Emitido em: {new Date(doc.created_at).toLocaleDateString()}</p>
              </div>
              <button 
                onClick={() => handleDownload(doc.url_pdf)}
                className="bg-teal-50 text-teal-700 px-4 py-2 rounded-lg font-medium hover:bg-teal-100"
              >
                Download
              </button>
            </div>
          )) : <p>Nenhum documento encontrado.</p>}
        </div>
      </div>
    </div>
  );
}
