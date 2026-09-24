import { createBrowserClient } from '@supabase/ssr'
import { createLocalClient } from '@/lib/local-db'
import { isLocalMockEnabled } from './config'

let client: any = null

export function createClient() {
  if (isLocalMockEnabled()) {
    return createLocalClient()
  }

  if (!client) {
    const newClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    newClient.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') client = null
    })
    client = newClient
  }
  return client
}

