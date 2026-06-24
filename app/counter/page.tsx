import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import CounterDashboard from '@/components/counter/counter-dashboard'
import SignOut from '@/components/auth-signout'

export default async function CounterPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  
  if (!session?.user) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Counter Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage your counter and queue</p>
            </div>
            <SignOut />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <CounterDashboard />
      </main>
    </div>
  )
}
