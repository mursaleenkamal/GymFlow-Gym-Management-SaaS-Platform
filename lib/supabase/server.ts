import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createLocalClient, store } from '@/lib/local-db'
import type { LocalUser } from '@/lib/local-db/types'
import { isLocalMockEnabled, MOCK_SESSION_COOKIE, parseMockSessionCookie } from './config'

export async function createClient() {
  let mockUser: LocalUser | null = null
  let hasMockSession = false

  try {
    const cookieStore = await cookies()
    const mockCookie = cookieStore.get(MOCK_SESSION_COOKIE)?.value
    const parsed = parseMockSessionCookie(mockCookie)
    if (parsed) {
      hasMockSession = true
      const users = store.getTable<LocalUser>('users')
      mockUser =
        users.find(
          (u) =>
            u.id === parsed.userId ||
            u.email?.toLowerCase() === parsed.email?.toLowerCase()
        ) || {
          id: parsed.userId,
          email: parsed.email || '',
          role: 'authenticated',
          user_metadata: { name: parsed.name },
          created_at: new Date().toISOString(),
        }
    }
  } catch {
    // Called in context without cookies or malformed cookie
  }

  if (isLocalMockEnabled() || (process.env.NODE_ENV === 'development' && hasMockSession)) {
    return createLocalClient(mockUser) as any
  }

  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not set.')
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component — safe to ignore
        }
      },
    },
  })
}