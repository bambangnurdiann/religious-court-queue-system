'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

const NAVY = '#0C2340'
const GOLD = '#C8A84B'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isSignUp = mode === 'sign-up'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message ?? 'Something went wrong')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0A1F3A 50%, ${NAVY} 100%)` }}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 20% 50%, ${GOLD} 1px, transparent 1px),
          radial-gradient(circle at 80% 20%, ${GOLD} 1px, transparent 1px),
          radial-gradient(circle at 50% 80%, ${GOLD} 1px, transparent 1px)`,
        backgroundSize: '120px 120px, 200px 200px, 160px 160px',
        backgroundPosition: '0 0, 40px 60px, 80px 20px',
      }} />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[400px] animate-[fadeInUp_0.5s_ease-out]">
        {/* Gold accent bar */}
        <div className="h-1.5 rounded-t-2xl" style={{ backgroundColor: GOLD }} />

        <div className="bg-white rounded-b-2xl shadow-2xl shadow-black/20 p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-md"
              style={{ backgroundColor: NAVY }}
            >
              <span className="text-2xl select-none">⚖️</span>
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: NAVY }}>
              {isSignUp ? 'Daftar Akun' : 'Masuk ke Sistem'}
            </h1>
            <p className="text-sm text-gray-400">Pengadilan Agama Pasarwajo</p>
            {/* Gold decorative line */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-px w-8" style={{ backgroundColor: `${GOLD}40` }} />
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
              <div className="h-px w-8" style={{ backgroundColor: `${GOLD}40` }} />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {isSignUp && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-semibold text-gray-700">
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda"
                  required
                  autoComplete="name"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{ ['--tw-ring-color' as string]: `${NAVY}40` }}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                Alamat Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@domain.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200"
                style={{ ['--tw-ring-color' as string]: `${NAVY}40` }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{ ['--tw-ring-color' as string]: `${NAVY}40` }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700" role="alert">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-bold rounded-lg transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 shadow-md shadow-black/10"
              style={{ backgroundColor: NAVY }}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  <span>Mohon tunggu...</span>
                </>
              ) : isSignUp ? (
                'Daftar'
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-sm text-center mt-6 text-gray-500">
            {isSignUp ? 'Sudah punya akun? ' : 'Belum punya akun? '}
            <Link
              href={isSignUp ? '/sign-in' : '/sign-up'}
              className="font-semibold hover:underline underline-offset-4 transition-all"
              style={{ color: GOLD }}
            >
              {isSignUp ? 'Masuk' : 'Daftar'}
            </Link>
          </p>

          {/* Branding */}
          <p className="text-[10px] text-gray-300 text-center mt-6 tracking-wide uppercase select-none">
            Pengadilan Agama &bull; Sistem Antrian Digital
          </p>
        </div>
      </div>

      {/* Keyframes for fade-in animation */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  )
}