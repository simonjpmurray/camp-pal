'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Flame } from 'lucide-react'

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
    setOpen(false)
    router.refresh()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-stone-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-6 h-6" style={{ color: 'var(--forest)' }} />
          <span className="font-display text-lg font-semibold" style={{ color: 'var(--forest)' }}>
            Welcome to CampFire
          </span>
        </div>
        <h2 className="font-display text-xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>
          What should the group call you?
        </h2>
        <p className="text-sm text-stone-500 mb-5">
          This is the name your crew will see in chat and on packing claims.
        </p>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">
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
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-shadow"
            onFocus={e => (e.target.style.boxShadow = '0 0 0 2px #c0532a40')}
            onBlur={e => (e.target.style.boxShadow = '')}
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full text-white py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ background: 'var(--forest)' }}
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
