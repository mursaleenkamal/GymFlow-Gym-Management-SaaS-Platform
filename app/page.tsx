import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/dal'

export default async function Home() {
  const { user } = await getAuthUser()
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gymflow.sbs').toLowerCase().trim()

  if (user?.email && user.email.toLowerCase().trim() === adminEmail) {
    redirect('/admin')
  }

  redirect('/dashboard')
}
