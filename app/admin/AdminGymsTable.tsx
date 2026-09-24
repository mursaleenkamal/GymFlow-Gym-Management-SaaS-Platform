'use client'

import { useState } from 'react'
import { Dumbbell, Search, CheckCircle2, Ban, ShieldCheck, Phone, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

interface GymRow {
  id: string
  name: string
  owner_id: string
  phone?: string | null
  is_active: boolean
  subscription_status?: string | null
  created_at: string
}

export default function AdminGymsTable({ initialGyms }: { initialGyms: GymRow[] }) {
  const [gyms, setGyms] = useState<GymRow[]>(initialGyms)
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const toggleGymStatus = async (gym: GymRow) => {
    const nextState = !gym.is_active
    const confirmAction = window.confirm(
      nextState
        ? `Reactivate ${gym.name}? The gym owner will regain immediate access.`
        : `Suspend ${gym.name}? The gym owner will be blocked from logging in.`
    )
    if (!confirmAction) return

    setLoadingId(gym.id)
    try {
      const res = await fetch(`/api/gyms/${gym.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextState }),
      })

      if (res.ok) {
        setGyms(prev =>
          prev.map(g => (g.id === gym.id ? { ...g, is_active: nextState } : g))
        )
        toast.success(nextState ? `${gym.name} reactivated!` : `${gym.name} suspended!`)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to update gym status.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoadingId(null)
    }
  }

  const filtered = gyms.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.phone && g.phone.includes(search))
  )

  const getSubBadge = (status?: string | null) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Active</span>
      case 'trial':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Free Trial</span>
      case 'expired':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Expired</span>
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Standard</span>
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-indigo-600" />
            Registered Gym Tenants
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {gyms.length} registered gyms across the SaaS platform.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search gym name or phone..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="py-3 px-6">Gym Name</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Subscription</th>
              <th className="py-3 px-4">Access Status</th>
              <th className="py-3 px-4">Registered</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                  {search ? 'No gyms match your search query.' : 'No registered gyms found.'}
                </td>
              </tr>
            ) : (
              filtered.map(gym => (
                <tr key={gym.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-900 text-sm">{gym.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {gym.id.slice(0, 13)}...</div>
                  </td>
                  <td className="py-4 px-4">
                    {gym.phone ? (
                      <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {gym.phone}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {getSubBadge(gym.subscription_status)}
                  </td>
                  <td className="py-4 px-4">
                    {gym.is_active ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full text-xs border border-emerald-200/60">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-red-700 font-semibold bg-red-50 px-2.5 py-1 rounded-full text-xs border border-red-200/60">
                        <Ban className="w-3.5 h-3.5" />
                        Suspended
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(gym.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => toggleGymStatus(gym)}
                      disabled={loadingId === gym.id}
                      className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-sm ${
                        gym.is_active
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/80'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      } disabled:opacity-50`}
                    >
                      {loadingId === gym.id
                        ? 'Updating...'
                        : gym.is_active
                        ? 'Suspend Gym'
                        : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
