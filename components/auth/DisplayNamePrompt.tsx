'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { track } from '@vercel/analytics/react'
import { createClient } from '@/lib/supabase/client'

/**
 * One-time modal that asks anonymous users what the group should call them.
 * Without it, anonymous users show up in chat and packing claims with an empty
 * name, which kills the group-coordination feel.
 *
 * It appears only when the signed-in user is anonymous AND has no name set yet,
 * so once they pick a name (or sign in with a real account) it never shows
 * again. It's a modal, not a redirect — redirect-on-no-name would spam every
 * page load.
 */
export function DisplayNamePrompt() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      // Only anonymous users without a name need prompting. Real accounts
      // (email/Google) always carry a name and should never see this.
      if (!user || !user.is_anonymous) return

      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile?.name || profile.name.trim() === '') setOpen(true)
    }

    check()

    // Re-check once auth settles (the very first load races AnonymousAuth).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check()
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.rpc('update_my_profile', { new_name: trimmed })
    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }
    track('anon_setup_complete')
    setOpen(false)
    router.refresh()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="w-full max-w-sm rounded-[4px] shadow-xl border p-6"
        style={{ background: 'var(--canvas-raised)', borderColor: 'var(--hairline)' }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex items-center justify-center w-7 h-7 border-2 rounded-[3px]" style={{ borderColor: 'var(--ink)' }}>
            <span className="font-display font-bold text-base leading-none" style={{ color: 'var(--ink)' }}>C</span>
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: 'var(--ember)' }} />
          </span>
          <span className="kicker" style={{ color: 'var(--ember)' }}>Welcome to CampFire</span>
        </div>
        <h2 className="font-display text-2xl font-bold mb-1 tracking-tight" style={{ color: 'var(--ink)' }}>
          What should the group call you?
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--muted-text)' }}>
          This is the name your crew will see in chat and on packing claims.
        </p>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-[3px] px-3 py-2.5 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            required
            maxLength={80}
            placeholder="e.g. Sam"
            className="w-full border rounded-[3px] px-4 py-2.5 text-sm outline-none transition-shadow"
            style={{ background: 'var(--canvas)', borderColor: 'var(--hairline-strong)', color: 'var(--ink)' }}
            onFocus={e => (e.target.style.boxShadow = '0 0 0 2px #d4541e40')}
            onBlur={e => (e.target.style.boxShadow = '')}
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full text-white py-2.5 rounded-[3px] text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ background: 'var(--ember)' }}
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
