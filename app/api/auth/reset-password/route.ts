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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || 'http://localhost:3004'
    const redirectTo = `${appUrl}/auth/setup-password`

    // Local Mock DB Mode
    if (isLocalMockEnabled()) {
      const { store } = await import('@/lib/local-db')
      const users = store.getTable<any>('users')
      const user = users.find((u: any) => u.email?.toLowerCase() === normalizedEmail)

      if (!user) {
        // For security, don't leak user existence; return generic success
        return NextResponse.json({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        })
      }

      const devLink = `${appUrl}/auth/setup-password#type=recovery&access_token=mock-token-${user.id}`

      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
        devLink,
      })
    }

    // Supabase Mode
    try {
      const adminClient = createAdminClient()
      const { data, error } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: {
          redirectTo,
        },
      })

      if (error) {
        // Fallback to client resetPasswordForEmail
        const supabase = await createClient()
        await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo,
        })
      }

      const devLink = process.env.NODE_ENV === 'development' ? data?.properties?.action_link : undefined

      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
        devLink,
      })
    } catch {
      const supabase = await createClient()
      await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      })

      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }
  } catch (err: unknown) {
    console.error('[API /api/auth/reset-password] Error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}
