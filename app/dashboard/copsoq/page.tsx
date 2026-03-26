import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCopsoqGroupAggregate } from '@/lib/copsoq/services/group-aggregate'
import { getCopsoqMinRespondentsThreshold } from '@/lib/copsoq/auth/access'
import { getSupabaseServerClient } from '@/lib/supabase/server'

function startOfMonthISO(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

function endOfMonthISO(date: Date): string {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const last = new Date(Date.UTC(year, month + 1, 0))
  const y = last.getUTCFullYear()
  const m = String(last.getUTCMonth() + 1).padStart(2, '0')
  const d = String(last.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type UserProfileRow = {
  role: string
  company_id: string | null
  is_active: boolean
}

export default async function DashboardCopsoqPage() {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('role, company_id, is_active')
    .eq('user_id', user.id)
    .maybeSingle()

  const profile = profileData as UserProfileRow | null

  if (!profile || !profile.is_active || !profile.company_id) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 md:p-10">
        <section className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-2xl p-6">
          <h1 className="text-xl font-black text-slate-900">COPSOQ Coletivo</h1>
          <p className="text-sm text-slate-600 mt-3">Perfil sem empresa vinculada para visualizacao agregada.</p>
          <Link href="/dashboard" className="inline-block mt-4 text-sm font-bold text-blue-700">
            Voltar para dashboard
          </Link>
        </section>
      </main>
    )
  }

  const now = new Date()
  const periodStart = startOfMonthISO(now)
  const periodEnd = endOfMonthISO(now)

  let aggregate = null
  try {
    aggregate = await getCopsoqGroupAggregate(
      {
        questionnaireCode: 'copsoq_ii_short_v1_br',
        companyId: profile.company_id,
        periodStart,
        periodEnd,
        setorId: null,
        setorNome: null,
        gheId: null,
        gheNome: null,
      },
      {
        technicalView: profile.role === 'admin' || profile.role === 'tecnico',
        minRespondents: getCopsoqMinRespondentsThreshold(),
      }
    )
  } catch {
    aggregate = null
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <section className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-black">COPSOQ II - Visao Coletiva</p>
          <h1 className="text-2xl font-black text-slate-900 mt-2">Medias por Dimensao</h1>
          <p className="text-sm text-slate-600 mt-2">
            Periodo de referencia: {periodStart} ate {periodEnd}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Regra de confidencialidade: exibicao agregada com minimo de {getCopsoqMinRespondentsThreshold()} respondentes.
          </p>
        </header>

        {!aggregate ? (
          <article className="bg-white border border-rose-200 rounded-2xl p-6 text-rose-700 text-sm font-medium">
            Nao foi possivel carregar os dados agregados COPSOQ para este periodo.
          </article>
        ) : (
          <>
            <section className="grid md:grid-cols-4 gap-4">
              <article className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black text-slate-500">Respondentes</p>
                <p className="text-3xl font-black text-slate-900 mt-2">{aggregate.respondentCountTotal}</p>
              </article>
              <article className="bg-white border border-emerald-200 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black text-emerald-700">Dimensoes Saudaveis</p>
                <p className="text-3xl font-black text-emerald-700 mt-2">{aggregate.summary.saudavel}</p>
              </article>
              <article className="bg-white border border-amber-200 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black text-amber-700">Dimensoes em Alerta</p>
                <p className="text-3xl font-black text-amber-700 mt-2">{aggregate.summary.medioAlerta}</p>
              </article>
              <article className="bg-white border border-rose-200 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black text-rose-700">Dimensoes Criticas</p>
                <p className="text-3xl font-black text-rose-700 mt-2">{aggregate.summary.critico}</p>
              </article>
            </section>

            {aggregate.privacy.masked ? (
              <article className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-800 text-sm font-medium">
                {aggregate.privacy.reason}
              </article>
            ) : (
              <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <p className="text-[11px] uppercase tracking-widest font-black text-slate-500">Consolidado por Dimensao</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest">
                      <tr>
                        <th className="text-left px-4 py-3">Dimensao</th>
                        <th className="text-left px-4 py-3">Media</th>
                        <th className="text-left px-4 py-3">Classificacao</th>
                        <th className="text-left px-4 py-3">Respondentes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregate.dimensions.map((item) => (
                        <tr key={item.dimensionCode} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-semibold text-slate-900">{item.dimensionName}</td>
                          <td className="px-4 py-3 text-slate-700">{item.meanScore}</td>
                          <td className="px-4 py-3 text-slate-700">{item.classificationLabel}</td>
                          <td className="px-4 py-3 text-slate-700">{item.respondentCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  )
}
