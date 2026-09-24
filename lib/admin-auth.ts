import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const DEFAULT_ADMIN_EMAIL = 'admin@gymflow.sbs'

/**
 * Verifies that an incoming request is from a platform Super Admin.
 * Accepts EITHER:
 * 1. An Authorization Bearer token matching ADMIN_PASSWORD.
 * 2. An active authenticated session cookie where user.email matches ADMIN_EMAIL.
 */
export async function verifySuperAdmin(req?: NextRequest): Promise<boolean> {
  const adminEmail = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase().trim()

  // 1. Check Bearer token in Authorization header if request is provided
  if (req) {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null
    const validPassword = process.env.ADMIN_PASSWORD
    if (token && validPassword && token === validPassword) {
      return true
    }
  }

  // 2. Check session cookie
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email && user.email.toLowerCase().trim() === adminEmail) {
      return true
    }
  } catch {
    // Session check failed or unauthenticated
  }

  return false
}
