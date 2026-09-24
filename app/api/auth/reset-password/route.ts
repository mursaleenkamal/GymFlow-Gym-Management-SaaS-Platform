import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isLocalMockEnabled } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { email } = body

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'
    const redirectTo = `${origin}/auth/setup-password`

    // ── 1. Local Mock DB Mode ───────────────────────────────────────────────
    if (isLocalMockEnabled()) {
      const { store } = await import('@/lib/local-db')
      const users = store.getTable<any>('users')
      const user = users.find((u: any) => u.email?.toLowerCase() === normalizedEmail)

      if (!user) {
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        })
      }

      const devLink = `${origin}/auth/setup-password#type=recovery&access_token=mock-token-${user.id}`

      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
        devLink,
      })
    }

    // ── 2. Live Supabase Mode ───────────────────────────────────────────────
    const supabase = await createClient()

    // Send actual password recovery email via Supabase Auth
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    })

    if (resetError) {
      console.error('[API /api/auth/reset-password] Supabase error:', resetError)

      if (
        resetError.message?.toLowerCase().includes('rate limit') ||
        (resetError as any).status === 429 ||
        (resetError as any).code === 'over_email_send_rate_limit'
      ) {
        return NextResponse.json(
          {
            error:
              'Email rate limit reached for Supabase. The default free email service allows only a few emails per hour. Please wait a few minutes, or configure custom SMTP in your Supabase dashboard.',
          },
          { status: 429 }
        )
      }

      return NextResponse.json({ error: resetError.message }, { status: 400 })
    }

    // In local dev environment with live Supabase, also generate a recovery link for instant testing
    let devLink: string | undefined
    if (process.env.NODE_ENV === 'development' || origin.includes('localhost')) {
      try {
        const adminClient = createAdminClient()
        const { data: linkData } = await adminClient.auth.admin.generateLink({
          type: 'recovery',
          email: normalizedEmail,
          options: { redirectTo },
        })
        devLink = linkData?.properties?.action_link
      } catch {
        // Safe to ignore in case of admin permission error
      }
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      devLink,
    })
  } catch (err: unknown) {
    console.error('[API /api/auth/reset-password] Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}
