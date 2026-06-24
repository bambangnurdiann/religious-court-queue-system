import webpush from 'web-push'

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@pengadilan-agama.go.id',
    vapidPublicKey,
    vapidPrivateKey
  )
}

export async function sendPushNotification(
  subscription: any,
  payload: { title: string; body: string; icon?: string; badge?: string; tag?: string; requireInteraction?: boolean; data?: any }
) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
  } catch (error: any) {
    if (error.statusCode === 410) {
      // Subscription expired, should be cleaned up
      console.log('[Push] Subscription expired (410), needs cleanup')
      throw new Error('EXPIRED_SUBSCRIPTION')
    }
    console.error('[Push] Error sending notification:', error)
  }
}

export async function notifyVisitorPosition(
  pushSubscription: any,
  queueNumber: string,
  counterCode: string,
  positionAhead: number,
  qrToken?: string
) {
  const counterNames: Record<string, string> = {
    A: 'Meja Informasi', B: 'Pendaftaran Perkara', C: 'Kasir', D: 'Pengambilan Produk', E: 'Meja E-Court'
  }
  
  if (positionAhead <= 2) {
    await sendPushNotification(pushSubscription, {
      title: '🔔 Giliran Anda Segera Tiba!',
      body: `Nomor ${queueNumber}, ${positionAhead === 0 ? 'ini giliran Anda!' : `${positionAhead} orang lagi`}. Silakan bersiap menuju ${counterNames[counterCode]}.`,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'queue-position',
      requireInteraction: positionAhead === 0,
      data: { url: qrToken ? `/q/${qrToken}` : `/q/${queueNumber}` }
    })
  }
}

export async function notifyVisitorCalled(
  pushSubscription: any,
  queueNumber: string,
  counterCode: string,
  qrToken?: string
) {
  const counterNames: Record<string, string> = {
    A: 'Meja Informasi', B: 'Pendaftaran Perkara', C: 'Kasir', D: 'Pengambilan Produk', E: 'Meja E-Court'
  }
  
  await sendPushNotification(pushSubscription, {
    title: '📢 Nomor Anda Dipanggil!',
    body: `Nomor ${queueNumber}, silakan menuju ${counterNames[counterCode]}.`,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'queue-called',
    requireInteraction: true,
    data: { url: qrToken ? `/q/${qrToken}` : `/q/${queueNumber}` }
  })
}
