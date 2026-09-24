import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifySuperAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifySuperAdmin(req)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()


    const { data: gyms, error } = await supabase
      .from('gyms')
      .select('id, name, created_at, is_active, owner_id')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch members count for each
    const { data: members, error: mErr } = await supabase
      .from('members')
      .select('gym_id')
    
    const memberCounts = members?.reduce((acc: any, m: any) => {
      acc[m.gym_id] = (acc[m.gym_id] || 0) + 1
      return acc
    }, {}) || {}

    const result = gyms.map((g: any) => ({
      id: g.id,
      name: g.name,
      created_at: g.created_at,
      is_active: g.is_active ?? true,
      memberCount: memberCounts[g.id] || 0,
    }))

    console.log('[GET /api/gyms] Result:', JSON.stringify(result, null, 2))
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
