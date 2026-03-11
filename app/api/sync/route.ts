import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; // Sua conexão com Supabase

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      cnpj_clinica, cnpj_cliente, cpf_funcionario, 
      nome_funcionario, tipo_documento, data_emissao, 
      arquivo_base64, hash_integracao 
    } = body;

    // 1. Validação de Segurança (API Key)
    const apiKey = request.headers.get('x-novavix-api-key');
    if (apiKey !== process.env.NOVAVIX_API_KEY) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Converter Base64 de volta para Binário (Buffer)
    const buffer = Buffer.from(arquivo_base64, 'base64');
    const fileName = `${cnpj_clinica}/${hash_integracao}.pdf`;

    // 3. Upload para o Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('documentos')
      .upload(fileName, buffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (storageError) throw storageError;

    // 4. Pegar a URL pública ou assinada do arquivo
    const { data: { publicUrl } } = supabase.storage
      .from('documentos')
      .getPublicUrl(fileName);

    // 5. Inserir os metadados na Tabela SQL que criamos
    const { error: dbError } = await supabase
      .from('documentos_portal')
      .insert([
        {
          cnpj_clinica,
          cnpj_cliente,
          cpf_funcionario,
          nome_funcionario,
          tipo_documento,
          data_emissao,
          url_arquivo: publicUrl,
          hash_integracao
        }
      ]);

    if (dbError) throw dbError;

    return NextResponse.json({ message: 'Sincronizado com sucesso!' }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
