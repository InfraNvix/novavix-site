import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { syncSupabaseToMongo } from '@/lib/mongodb/mirror/supabase-sync'

type ApiErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR'

function errorResponse(status: number, code: ApiErrorCode, message: string, details?: string[]): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message, details: details ?? [] } }, { status })
}

export async function POST(): Promise<NextResponse> {
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

    if (profile.role !== 'admin') {
      return errorResponse(403, 'FORBIDDEN', 'Acesso restrito ao admin.')
    }

    const syncResult = await syncSupabaseToMongo()

    return NextResponse.json(
      {
        ok: true,
        data: {
          message: 'Sincronizacao Supabase -> Mongo concluida.',
          synced: syncResult.synced,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const details = error instanceof Error ? [error.message] : []
    return errorResponse(500, 'INTERNAL_ERROR', 'Falha ao sincronizar Supabase para MongoDB.', details)
  }
}
