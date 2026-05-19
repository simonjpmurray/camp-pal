'use client'

import { useEffect, useState } from 'react'
import { registerServiceWorker, subscribeToPush, savePushSubscription, requestNotificationPermission } from '@/lib/push'
import { Bell, BellOff, X } from 'lucide-react'

export default function PushSetup() {
  const [showBanner, setShowBanner] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const already = localStorage.getItem('push-setup-dismissed')
    if (already) return

    // Register SW regardless of permission state
    registerServiceWorker()

    // Check existing permission
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setupPush()
      } else if (Notification.permission === 'default') {
        // Show banner after short delay
        setTimeout(() => setShowBanner(true), 3000)
      }
    }
  }, [])

  async function setupPush() {
    const reg = await registerServiceWorker()
    if (!reg) return
    const sub = await subscribeToPush(reg)
    if (sub) {
      await savePushSubscription(sub)
      setSubscribed(true)
    }
  }

  async function handleEnable() {
    const granted = await requestNotificationPermission()
    if (granted) {
      await setupPush()
      setShowBanner(false)
    } else {
      dismiss()
    }
  }

  function dismiss() {
    localStorage.setItem('push-setup-dismissed', '1')
    setShowBanner(false)
    setDismissed(true)
  }

  if (!showBanner || dismissed || subscribed) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 inset-x-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-2">
      <div className="bg-white rounded-2xl border border-stone-100 shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#fbe9d8' }}>
            <Bell className="w-5 h-5" style={{ color: 'var(--forest)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-800">Stay in the loop</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Get notified when your crew joins, claims items, or sends messages.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                style={{ background: 'var(--forest)' }}
              >
                Enable
              </button>
              <button
                onClick={dismiss}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"
              >
                Not now
              </button>
            </div>
          </div>
          <button onClick={dismiss} className="p-1 text-stone-400 hover:text-stone-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
