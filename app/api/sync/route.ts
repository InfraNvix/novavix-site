import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cnpj, nome_cliente, tipo_documento, url_pdf } = body;

    const { error } = await supabase
      .from('documentos')
      .insert([{ cnpj, nome_cliente, tipo_documento, url_pdf }]);

    if (error) throw error;

    return NextResponse.json({ message: 'Sincronizado com sucesso' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
