import { createAdminClient } from '@/lib/supabase/admin'
import AdminSubscriptionList from './AdminSubscriptionList'

export const revalidate = 0

export default async function AdminSubscriptionsPage() {
  const supabase = createAdminClient()

  const { data: requests } = await supabase
    .from('subscription_requests')
    .select(`
      id, status, submitted_at, reviewed_at,
      transaction_id, notes, rejection_reason, uploaded_file_url,
      gyms ( id, name, owner_id )
    `)
    .order('submitted_at', { ascending: false })

  const formattedRequests = await Promise.all(
    (requests ?? []).map(async (r: any) => {
      let signedUrl = null
      if (r.uploaded_file_url) {
        try {
          const { data } = await supabase.storage
            .from('payment-proofs')
            .createSignedUrl(r.uploaded_file_url, 3600)
          signedUrl = data?.signedUrl ?? null
        } catch {
          // Non-blocking
        }
      }
      return {
        ...r,
        status: r.status || 'pending',
        submitted_at: r.submitted_at || r.created_at || new Date().toISOString(),
        signedUrl,
        gyms: Array.isArray(r.gyms) ? r.gyms[0] : (r.gyms || null),
      }
    })
  )

  return <AdminSubscriptionList requests={formattedRequests as any} />
}
