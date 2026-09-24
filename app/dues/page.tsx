import { createClient } from '@/lib/supabase/server'
import { getAuthUser, getGym } from '@/lib/dal'
import { DuesClient } from './DuesClient'
import { getMemberStatus } from '@/lib/utils'
import { cacheWrapper } from '@/lib/cache'

export default async function DuesPage() {
  const { user } = await getAuthUser()
  if (!user) return null

  const { gym } = await getGym(user.id)
  if (!gym) return null

  const cacheKey = `gym:${gym.id}:dues_list`
  const { dueMembers, totalDues } = await cacheWrapper(cacheKey, 120, async () => {
    const supabase = await createClient()

    // Filter pending_amount > 0 in DB, only fetch needed columns
    const { data: members } = await supabase
      .from('members')
      .select('id, name, phone, member_number, pending_amount, memberships(end_date)')
      .eq('gym_id', gym.id)
      .gt('pending_amount', 0)
      .order('pending_amount', { ascending: false })
      .limit(500)

    const list = (members ?? [])
      .map((m: any) => {
        const memberships = (m.memberships as { end_date: string }[]) ?? []
        const latestEndDate = memberships.reduce(
          (max: string, ms: any) => (ms.end_date > max ? ms.end_date : max),
          ''
        )
        const status = latestEndDate ? getMemberStatus(latestEndDate) : 'expired'
        return {
          id: m.id,
          name: m.name,
          phone: m.phone,
          member_number: m.member_number,
          pending_amount: m.pending_amount ?? 0,
          status,
        }
      })

    const total = list.reduce((s: number, m: any) => s + m.pending_amount, 0)
    return { dueMembers: list, totalDues: total }
  })

  return <DuesClient members={dueMembers} gymId={gym.id} totalDues={totalDues} />
}
