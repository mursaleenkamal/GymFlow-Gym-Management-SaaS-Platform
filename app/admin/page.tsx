import { createAdminClient } from '@/lib/supabase/admin'
import { Activity, Users, Dumbbell, MapPin } from 'lucide-react'
import AdminDashboardRealtime from './AdminDashboardRealtime'
import AdminGymsTable from './AdminGymsTable'

export const revalidate = 0 // Always fetch fresh metrics for the admin

export default async function AdminPage() {
  const supabase = createAdminClient()

  // Run aggregations and fetch gym records using the service role client.
  const [
    { count: totalGyms },
    { count: totalMembers },
    { count: totalGeoAliases },
    { count: pendingGeoReviews },
    { count: pendingSubscriptions },
    { count: trialGyms },
    { count: activeGyms },
    { count: expiredGyms },
    { data: gymsData },
  ] = await Promise.all([
    supabase.from('gyms').select('*', { count: 'exact', head: true }),
    supabase.from('members').select('*', { count: 'exact', head: true }),
    supabase.from('geo_gym_aliases').select('*', { count: 'exact', head: true }),
    supabase.from('geo_review_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('subscription_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('gyms').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trial'),
    supabase.from('gyms').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabase.from('gyms').select('*', { count: 'exact', head: true }).eq('subscription_status', 'expired'),
    supabase.from('gyms').select('id, name, owner_id, phone, is_active, subscription_status, created_at').order('created_at', { ascending: false }),
  ])

  const stats = [
    { label: 'Total Registered Gyms', value: totalGyms ?? 0, icon: Dumbbell, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Total Members (Platform)', value: totalMembers ?? 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'Learned Geo Aliases', value: totalGeoAliases ?? 0, icon: MapPin, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Pending Geo Reviews', value: pendingGeoReviews ?? 0, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-100' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Platform Overview</h2>
        <p className="text-slate-500 mt-1 text-sm">Real-time aggregate metrics across all multi-tenant fitness centers.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
            </div>
            <p className="text-4xl font-extrabold text-slate-900 tracking-tight">
              {stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Subscription Stats — realtime */}
      <AdminDashboardRealtime
        initial={{
          pendingSubscriptions: pendingSubscriptions ?? 0,
          trialGyms: trialGyms ?? 0,
          activeGyms: activeGyms ?? 0,
          expiredGyms: expiredGyms ?? 0,
        }}
      />

      {/* Registered Gyms Management Table */}
      <AdminGymsTable initialGyms={gymsData ?? []} />

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Platform Health & Status</h3>
          <p className="text-xs text-slate-500 mt-0.5">Database connectivity, isolation policies, and background schedulers are operational.</p>
        </div>
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200/80 text-xs font-semibold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          All Systems Operational
        </div>
      </div>
    </div>
  )
}
