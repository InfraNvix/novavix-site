import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

type ApiErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR'

function errorResponse(status: number, code: ApiErrorCode, message: string, details?: string[]): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details: details ?? [],
      },
    },
    { status }
  )
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse(401, 'UNAUTHORIZED', 'Sessao invalida.')
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.is_active) {
      return errorResponse(403, 'FORBIDDEN', 'Perfil inativo.')
    }

    if (profile.role !== 'admin' && profile.role !== 'tecnico' && profile.role !== 'clinica') {
      return errorResponse(403, 'FORBIDDEN', 'Acesso restrito ao admin.')
    }

    const url = new URL(request.url)
    const companyId = (url.searchParams.get('companyId') ?? '').trim()

    const admin = getSupabaseAdminClient()
    let query = admin
      .from('company_form_templates')
      .select('id, company_id, template_name, source_format, source_file_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (companyId.length > 0) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query
    if (error) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao listar templates.')
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          templates:
            data?.map((row) => ({
              id: row.id,
              companyId: row.company_id,
              templateName: row.template_name,
              sourceFormat: row.source_format,
              sourceFileName: row.source_file_name,
              status: row.status,
              createdAt: row.created_at,
            })) ?? [],
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao listar templates.', details)
  }
}

