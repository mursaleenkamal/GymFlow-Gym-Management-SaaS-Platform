import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from './OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let gym: { id: string; name: string; onboarding_completed: boolean } | null = null
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('gyms')
      .select('id, name, onboarding_completed')
      .eq('owner_id', user.id)
      .maybeSingle()
    gym = data
  } catch {
    const { data } = await supabase
      .from('gyms')
      .select('id, name, onboarding_completed')
      .eq('owner_id', user.id)
      .maybeSingle()
    gym = data
  }

  // Already onboarded — send to dashboard
  if (gym?.onboarding_completed) redirect('/dashboard')

  return <OnboardingWizard gymId={gym?.id ?? null} gymName={gym?.name ?? ''} />
}

