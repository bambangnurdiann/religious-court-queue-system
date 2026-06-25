import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  
  if (!session?.user) {
    redirect('/sign-in')
  }

  const cards = [
    {
      href: '/satpam',
      icon: '🔐',
      bg: 'bg-blue-100',
      title: 'Portal Satpam',
      desc: 'Aktivasi kartu antrian dan pencetakan nomor antrian pengunjung',
      label: 'Buka Portal',
    },
    {
      href: '/loket',
      icon: '🏪',
      bg: 'bg-green-100',
      title: 'Dashboard Loket',
      desc: 'Panggil antrian, kelola layanan, dan lihat laporan harian',
      label: 'Buka Dashboard',
    },
    {
      href: '/visitor',
      icon: '👤',
      bg: 'bg-orange-100',
      title: 'Cek Status Antrian',
      desc: 'Masukkan nomor antrian untuk melihat posisi antrian Anda',
      label: 'Cek Status',
    },
    {
      href: '/display',
      icon: '📺',
      bg: 'bg-purple-100',
      title: 'Tampilan Publik',
      desc: 'Papan informasi antrian untuk ditampilkan di lobby',
      label: 'Buka Tampilan',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Sistem Antrian Pengadilan Agama</h1>
          <p className="mt-1 text-sm text-gray-500">Portal Manajemen Antrian Digital</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.href} href={c.href}>
              <div className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-md">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${c.bg}`}>
                  <span className="text-2xl">{c.icon}</span>
                </div>
                <h2 className="text-base font-semibold text-gray-900">{c.title}</h2>
                <p className="mt-2 text-sm text-gray-500">{c.desc}</p>
                <span className="mt-4 inline-block text-sm font-medium text-blue-600 group-hover:underline">
                  {c.label} →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Informasi Sistem</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">Login sebagai</p>
              <p className="mt-1 font-semibold text-gray-900">{session.user.name || session.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Peran</p>
              <p className="mt-1 font-semibold text-gray-900">Administrator</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Login Terakhir</p>
              <p className="mt-1 font-semibold text-gray-900">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
