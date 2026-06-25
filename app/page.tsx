import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SignOut from '@/components/auth-signout'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  
  if (!session?.user) {
    redirect('/sign-in')
  }

  const cards = [
    {
      href: '/satpam',
      icon: '🔐',
      title: 'Portal Satpam',
      desc: 'Aktivasi & penerbitan nomor antrian',
    },
    {
      href: '/loket',
      icon: '🏪',
      title: 'Dashboard Loket',
      desc: 'Panggil antrian & kelola layanan',
    },
    {
      href: '/display',
      icon: '📺',
      title: 'Tampilan Publik',
      desc: 'Papan informasi antrian lobby',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#0C2340' }}>
        <div>
          <h1 className="text-lg font-bold text-white">Sistem Antrian Digital</h1>
          <p className="text-xs text-white/50">Pengadilan Agama Pasarwajo</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/70 hidden sm:block">{session.user.name || session.user.email}</span>
          <SignOut />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.href} href={c.href}>
              <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#0C2340] hover:shadow-sm transition-all cursor-pointer">
                <span className="text-2xl">{c.icon}</span>
                <h2 className="mt-3 font-semibold text-gray-900 text-sm">{c.title}</h2>
                <p className="mt-1 text-xs text-gray-500">{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Informasi Login</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Pengguna</p>
              <p className="font-semibold text-gray-800 mt-0.5">{session.user.name || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Tanggal</p>
              <p className="font-semibold text-gray-800 mt-0.5">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}