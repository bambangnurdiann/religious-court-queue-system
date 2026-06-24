import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import VisitorQueue from '@/components/visitor/visitor-queue'
import SignOut from '@/components/auth-signout'

export default async function VisitorPage() {
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
              <h1 className="text-2xl font-bold text-foreground">Queue Status</h1>
              <p className="text-sm text-muted-foreground">Check your position</p>
            </div>
            <SignOut />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <VisitorQueue />
      </main>
    </div>
  )
}
