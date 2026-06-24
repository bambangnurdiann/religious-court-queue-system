import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Status Antrian',
  description: 'Pantau status antrian Anda secara real-time',
}

export default function QueueLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Google Fonts: Plus Jakarta Sans + JetBrains Mono */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  )
}
