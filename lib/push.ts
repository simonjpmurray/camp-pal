export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null

  // In development the SW's cache-first strategy serves stale JS chunks
  // (Turbopack reuses chunk URLs across rebuilds), which surfaces as confusing
  // "my fix isn't taking effect" bugs. Skip registration in dev, and proactively
  // unregister any worker + clear caches left over from a prod build or an
  // earlier dev session so the page self-heals on the next load.
  if (process.env.NODE_ENV !== 'production') {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
    } catch { /* best-effort cleanup */ }
    return null
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return reg
  } catch (err) {
    console.error('SW registration failed', err)
    return null
  }
}

export async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return null

  try {
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
    return sub
  } catch {
    return null
  }
}

export async function savePushSubscription(sub: PushSubscription) {
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  })
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return view
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}
