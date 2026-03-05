import { ensureAdmin, getTicketPackages, getSystemSettings } from '@/app/actions/admin'
import AdminTicketPackages from '@/app/components/AdminTicketPackages'
import AdminSystemSettings from '@/app/components/AdminSystemSettings'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  await ensureAdmin()
  const packages = await getTicketPackages()
  const settings = await getSystemSettings()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
            &larr; Back to Home
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <section>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-2">Welcome, Admin</h2>
              <p className="text-gray-600">
                Manage your application settings and content here.
              </p>
            </div>
            
            <AdminSystemSettings settings={settings} />
            <div className="mt-8">
              <AdminTicketPackages packages={packages} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
