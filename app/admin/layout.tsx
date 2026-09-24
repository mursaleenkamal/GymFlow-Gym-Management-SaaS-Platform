import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import AdminHeader from './AdminHeader'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Security check: Only allow the platform owner to access this route.
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gymflow.sbs').toLowerCase().trim()
  const currentEmail = (user.email || '').toLowerCase().trim()

  if (currentEmail !== adminEmail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            Logged in as <strong className="text-slate-800">{user.email}</strong>. You do not have super-admin privileges to view the platform dashboard.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            Go to Gym Dashboard →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AdminHeader adminEmail={user.email || adminEmail} />
      <main className="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
