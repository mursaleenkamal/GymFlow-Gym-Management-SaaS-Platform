import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isLocalMockEnabled, MOCK_SESSION_COOKIE } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()

    const response = NextResponse.json({ success: true })

    if (isLocalMockEnabled()) {
      response.cookies.delete(MOCK_SESSION_COOKIE)
    }

    return response
  } catch (err) {
    console.error('[API /api/auth/logout] Error:', err)
    return NextResponse.json({ error: 'Failed to log out' }, { status: 500 })
  }
}
