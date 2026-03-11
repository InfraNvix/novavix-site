'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Portal() {
  const [cnpj, setCnpj] = useState('');
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const buscarDocumentos = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('cnpj', cnpjLimpo)
      .order('created_at', { ascending: false });

    if (error) {
      setErro('Erro ao buscar documentos.');
    } else if (data && data.length === 0) {
      setErro('Nenhum documento encontrado.');
      setDocumentos([]);
    } else {
      setDocumentos(data || []);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-blue-900 p-6 text-white shadow-xl">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black">NOVAVIX PORTAL</h1>
          <a href="/" className="text-sm opacity-80 hover:opacity-100">Voltar ao site</a>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 lg:p-12">
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-blue-50">
          <h2 className="text-3xl font-bold text-blue-900 mb-2">Consulta de Documentos</h2>
          <p className="text-slate-500 mb-8">Digite o CNPJ da empresa.</p>

          <form onSubmit={buscarDocumentos} className="flex flex-col sm:flex-row gap-4 mb-12">
            <input
              type="text"
              placeholder="00.000.000/0000-00"
              className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-teal-500 focus:outline-none transition"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              required
            />
            <button 
              type="submit"
              disabled={loading}
              className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-10 py-4 rounded-2xl transition disabled:opacity-50"
            >
              {loading ? 'Buscando...' : 'Consultar'}
            </button>
          </form>

          {erro && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100 text-center font-medium">
              {erro}
            </div>
          )}

          <div className="space-y-4">
            {documentos.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition">
                <div>
                  <h3 className="font-bold text-blue-900 uppercase">{doc.tipo_documento}</h3>
                  <p className="text-sm text-slate-400">
                    Emitido em: {new Date(doc.data_emissao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <a 
                  href={doc.url_pdf} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white border-2 border-blue-900 text-blue-900 px-6 py-2 rounded-xl font-bold hover:bg-blue-900 hover:text-white transition shadow-sm"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
