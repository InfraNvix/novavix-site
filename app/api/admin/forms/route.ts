import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getProfileMongoFirst, listTemplatesMongo } from '@/lib/mongodb/primary-store'

type ApiErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR' | 'VALIDATION_ERROR' | 'NOT_FOUND'

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

    const profile = await getProfileMongoFirst(user.id)

    if (!profile?.is_active) {
      return errorResponse(403, 'FORBIDDEN', 'Perfil inativo.')
    }

    if (profile.role !== 'admin' && profile.role !== 'tecnico' && profile.role !== 'clinica') {
      return errorResponse(403, 'FORBIDDEN', 'Acesso restrito ao admin.')
    }

    const url = new URL(request.url)
    const companyId = (url.searchParams.get('companyId') ?? '').trim()

    const data = await listTemplatesMongo(companyId.length > 0 ? companyId : undefined)

    return NextResponse.json(
      {
        ok: true,
        data: {
          templates:
            data.map((row) => ({
              id: row.id,
              companyId: row.company_id,
              templateName: row.template_name,
              sourceFormat: row.source_format,
              sourceFileName: row.source_file_name,
              status: row.status,
              createdAt: row.created_at,
            })),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao listar templates.', details)
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
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

    if (profile.role !== 'admin' && profile.role !== 'tecnico') {
      return errorResponse(403, 'FORBIDDEN', 'Acesso restrito ao admin.')
    }

    const url = new URL(request.url)
    const templateId = (url.searchParams.get('templateId') ?? '').trim()
    if (!templateId) {
      return errorResponse(422, 'VALIDATION_ERROR', 'templateId obrigatorio.')
    }

    const admin = getSupabaseAdminClient()
    const { data: existing, error: selectError } = await admin
      .from('company_form_templates')
      .select('id')
      .eq('id', templateId)
      .maybeSingle()

    if (selectError || !existing?.id) {
      return errorResponse(404, 'NOT_FOUND', 'Template nao encontrado.')
    }

    const { error: deleteError } = await admin.from('company_form_templates').delete().eq('id', templateId)
    if (deleteError) {
      return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao excluir template.')
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha interna ao excluir template.', details)
  }
}
