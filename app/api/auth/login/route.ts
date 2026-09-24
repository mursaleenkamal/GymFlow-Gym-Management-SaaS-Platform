import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { isLocalMockEnabled, MOCK_SESSION_COOKIE, serializeMockSession } from '@/lib/supabase/config'

const isRedisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)

const redis = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

const loginLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'ratelimit:login',
    })
  : null

const emailLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '5 m'),
      prefix: 'ratelimit:login_email',
    })
  : null

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    if (loginLimiter) {
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-real-ip') ??
        'unknown'

      const { success: ipAllowed, reset: ipReset } = await loginLimiter.limit(ip)
      if (!ipAllowed) {
        return NextResponse.json(
          { error: 'Too many login attempts. Please wait a moment and try again.' },
          {
            status: 429,
            headers: { 'Retry-After': String(Math.ceil((ipReset - Date.now()) / 1000)) },
          }
        )
      }
    }

    let body: { email?: string; password?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    let { email, password } = body

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    let normalizedEmail = email.toLowerCase().trim()

    // Smart aliases for convenience (e.g. typing "admin" or "owner")
    if (normalizedEmail === 'admin' || normalizedEmail === 'superadmin' || normalizedEmail === 'admin@gymflow.com') {
      normalizedEmail = (process.env.ADMIN_EMAIL || 'admin@gymflow.sbs').toLowerCase().trim()
    } else if (normalizedEmail === 'owner' || normalizedEmail === 'owner@gymflow.com' || normalizedEmail === 'owner@gymflow.test') {
      normalizedEmail = 'owner@powerfit.com'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email or username format' }, { status: 400 })
    }

    if (emailLimiter) {
      const { success: emailAllowed, reset: emailReset } = await emailLimiter.limit(normalizedEmail)
      if (!emailAllowed) {
        return NextResponse.json(
          { error: 'Too many attempts for this account. Please try again in a few minutes.' },
          {
            status: 429,
            headers: { 'Retry-After': String(Math.ceil((emailReset - Date.now()) / 1000)) },
          }
        )
      }
    }

    const supabase = await createClient()
    let { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    // If sign in fails, and we are in development mode or mock DB is enabled, try local mock auth
    if ((signInError || !data?.user) && (isLocalMockEnabled() || process.env.NODE_ENV === 'development')) {
      const { createLocalClient } = await import('@/lib/local-db')
      const localDb = createLocalClient()
      const localRes = await localDb.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })
      if (!localRes.error && localRes.data?.user) {
        data = localRes.data as any
        signInError = null
      }
    }

    if (signInError || !data?.user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: gymData } = await adminClient
      .from('gyms')
      .select('is_active, onboarding_completed')
      .eq('owner_id', data.user.id)
      .maybeSingle()

    if (gymData?.is_active === false) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Your access has been suspended by admin' }, { status: 403 })
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gymflow.sbs'
    const isAdmin = data.user.email?.toLowerCase() === adminEmail.toLowerCase()

    const response = NextResponse.json({
      success: true,
      onboardingCompleted: isAdmin ? true : (gymData?.onboarding_completed ?? false),
      userName: data.user.user_metadata?.name ?? null,
      isAdmin,
    })

    if (isLocalMockEnabled() || process.env.NODE_ENV === 'development') {
      response.cookies.set(
        MOCK_SESSION_COOKIE,
        serializeMockSession({
          userId: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name ?? '',
        }),
        {
          path: '/',
          httpOnly: false,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        }
      )
    }

    return response
  } catch (err) {
    console.error('[API /api/auth/login] Error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
