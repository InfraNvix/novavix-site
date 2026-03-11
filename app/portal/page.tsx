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
    
    // Limpa o CNPJ para buscar apenas números
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('cnpj', cnpjLimpo)
      .order('created_at', { ascending: false });

    if (error) {
      setErro('Erro ao buscar documentos. Tente novamente.');
    } else if (data && data.length === 0) {
      setErro('Nenhum documento encontrado para este CNPJ.');
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
          <h1 className="text-xl font-black tracking-tighter">NOVAVIX PORTAL</h1>
          <a href="/" className="text-sm opacity-80 hover:opacity-100 transition">Voltar ao site</a>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 lg:p-12">
        <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-blue-100 border border-blue-50">
          <h2 className="text-3xl font-bold text-blue-900 mb-2">Consulta de Documentos</h2>
          <p className="text-slate-500 mb-8 font-medium">Digite o CNPJ da empresa para acessar seus laudos e ASOs.</p>

          <form onSubmit={buscarDocumentos} className="flex flex-col sm:flex-row gap-4 mb-12">
            <input
              type="text"
              placeholder="00.000.000/0000-00"
              className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-teal-500 focus:outline-none transition text-lg"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              required
            />
            <button 
              type="submit"
              disabled={loading}
              className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-10 py-4 rounded-2xl transition shadow-lg shadow-teal-200 disabled:opacity-50"
            >
              {loading ? 'Buscando...' : 'Consultar'}
            </button>
          </form>

          {erro && (
            <div className="bg-red-50 text-red-6
