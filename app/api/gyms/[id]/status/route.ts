import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifySuperAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const isAuthorized = await verifySuperAdmin(req)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { is_active } = await req.json()

    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid is_active value' }, { status: 400 })
    }

    const supabase = createAdminClient()


    const { data, error } = await supabase
      .from('gyms')
      .update({ is_active })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, gym: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
