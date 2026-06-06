'use client'

import { useEffect, useRef, useState } from 'react'
import { Flame } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function WelcomeToast() {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [name, setName] = useState('')
  const hasShown = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (hasShown.current || !session?.user) return

      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', session.user.id)
        .maybeSingle()

      const displayName = profile?.name?.trim()
      if (!displayName) return

      hasShown.current = true
      setName(displayName)
      setVisible(true)

      setTimeout(() => setExiting(true), 3000)
      setTimeout(() => setVisible(false), 3500)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-sm font-medium transition-opacity duration-500 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--foreground)',
      }}
    >
      <Flame className="w-4 h-4 shrink-0" style={{ color: 'var(--forest)' }} />
      Welcome back, {name}!
    </div>
  )
}
