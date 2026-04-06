import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import AdminSetupClient from './ui'

export default async function DashboardAdminSetupPage() {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.is_active) {
    redirect('/dashboard')
  }

  if (profile.role !== 'admin' && profile.role !== 'tecnico') {
    redirect('/dashboard')
  }

  return <AdminSetupClient />
}

