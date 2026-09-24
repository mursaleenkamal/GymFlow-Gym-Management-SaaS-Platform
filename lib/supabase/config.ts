export const MOCK_SESSION_COOKIE = 'gymflow_mock_session'

export function isLocalMockEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_USE_LOCAL_MOCK_DB === 'true' ||
    process.env.USE_LOCAL_MOCK_DB === 'true' ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase') ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost')
  )
}

export function parseMockSessionCookie(
  cookieValue?: string | null
): { userId: string; email?: string; name?: string } | null {
  if (!cookieValue) return null
  try {
    let raw = cookieValue
    if (raw.includes('%')) {
      raw = decodeURIComponent(raw)
    }
    if (raw.includes('%')) {
      raw = decodeURIComponent(raw)
    }
    const data = JSON.parse(raw)
    if (data && data.userId) {
      return data
    }
    return null
  } catch {
    return null
  }
}

export function serializeMockSession(data: {
  userId: string
  email?: string
  name?: string
}): string {
  return JSON.stringify(data)
}

