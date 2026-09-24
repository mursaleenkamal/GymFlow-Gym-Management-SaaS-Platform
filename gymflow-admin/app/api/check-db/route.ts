import { NextResponse } from 'next/server'
import { verifyRequestAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase-admin'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await verifyRequestAuth(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Only return a health check count — no raw data exposed
  const { count, error } = await supabase
    .from('support_tickets')
    .select('*', { count: 'exact', head: true })

  if (error) {
    return NextResponse.json({ ok: false, error: 'Database query failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ticketCount: count })
}
