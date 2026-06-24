import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  
  if (!session?.user) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-foreground">Pengadilan Agama Queue System</h1>
          <p className="mt-1 text-muted-foreground">Religious Court Queue Management Portal</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Satpam Card */}
          <Link href="/satpam">
            <div className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <span className="text-2xl">🔐</span>
              </div>
              <h2 className="text-xl font-semibold text-foreground">Satpam Portal</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                QR code scanning and queue card activation for security officers
              </p>
              <Button className="mt-4 w-full" variant="outline">
                Access Portal
              </Button>
            </div>
          </Link>

          {/* Counter Card */}
          <Link href="/counter">
            <div className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <span className="text-2xl">🏪</span>
              </div>
              <h2 className="text-xl font-semibold text-foreground">Counter Dashboard</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage your counter, call next visitors, and track queue status
              </p>
              <Button className="mt-4 w-full" variant="outline">
                Access Dashboard
              </Button>
            </div>
          </Link>

          {/* Visitor Card */}
          <Link href="/visitor">
            <div className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                <span className="text-2xl">👤</span>
              </div>
              <h2 className="text-xl font-semibold text-foreground">Queue Status</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Check your position in queue using your card number
              </p>
              <Button className="mt-4 w-full" variant="outline">
                Check Status
              </Button>
            </div>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">System Information</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Logged in as</p>
              <p className="mt-1 font-semibold text-foreground">{session.user.name || session.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="mt-1 font-semibold text-foreground">Administrator</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Login</p>
              <p className="mt-1 font-semibold text-foreground">
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
