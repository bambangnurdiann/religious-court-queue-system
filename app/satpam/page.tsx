import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import SatpamDashboard from '@/components/satpam/satpam-dashboard'
import SignOut from '@/components/auth-signout'

export default async function SatpamPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  
  if (!session?.user) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Satpam Portal</h1>
              <p className="text-sm text-muted-foreground">Queue Card Management</p>
            </div>
            <SignOut />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <SatpamDashboard />
      </main>
    </div>
  )
}
