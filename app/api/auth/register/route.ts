import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLocalMockEnabled } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/register
 *
 * In development mode, registers a new gym owner with email_confirm: true
 * via the Supabase Admin API. This skips sending any email confirmation,
 * allowing instant local testing of the onboarding/registration flow.
 */
export async function POST(req: NextRequest) {
  try {
    const isDev =
      process.env.NODE_ENV === 'development' ||
      isLocalMockEnabled() ||
      process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') ||
      process.env.NEXT_PUBLIC_USE_LOCAL_MOCK_DB === 'true'

    if (!isDev) {
      return NextResponse.json(
        {
          success: false,
          devMode: false,
          error: 'Direct registration bypass is only available in development mode.',
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { fullName, email, mobileNumber } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 })
    }

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json({ error: 'Full name is required (at least 2 characters).' }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedFullName = fullName.trim()
    const trimmedMobile = typeof mobileNumber === 'string' ? mobileNumber.trim() : ''

    const adminClient = createAdminClient()
    const tempPassword = crypto.randomUUID()

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: trimmedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: trimmedFullName,
        name: trimmedFullName,
        mobile_number: trimmedMobile,
      },
    })

    if (createError) {
      const msg = createError.message?.toLowerCase() || ''
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Try signing in instead.' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      devMode: true,
      user: {
        id: newUser?.user?.id,
        email: trimmedEmail,
      },
      tempPassword,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error.' },
      { status: 500 }
    )
  }
}
