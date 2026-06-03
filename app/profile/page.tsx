'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppNav from '@/components/ui/AppNav'
import { Loader2, Check, Mail } from 'lucide-react'

export default function ProfilePage() {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      // No session yet — <AnonymousAuth /> is still signing the visitor in.
      // Don't bounce to /login; wait for onAuthStateChange to fire below.
      if (!user) return

      setIsAnonymous(!!user.is_anonymous)

      const { data: profile } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return
      if (profile) {
        setName(profile.name)
        setEmail(profile.email ?? '')
      }
      setLoading(false)
    }

    load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load()
    })
    return () => { cancelled = true; subscription.unsubscribe() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.rpc('update_my_profile', { new_name: name })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        <AppNav />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <AppNav />
      <main className="flex-1 mx-auto w-full px-4 sm:px-6 py-6 pb-24 md:pb-6 max-w-2xl">
        <h1 className="font-display text-3xl font-bold mb-8" style={{ color: 'var(--foreground)' }}>Profile</h1>

        {isAnonymous && (
          <Link
            href="/login"
            className="flex items-start gap-3 rounded-2xl border border-stone-100 bg-white p-4 mb-5 hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fbe9d8' }}>
              <Mail className="w-4.5 h-4.5" style={{ color: 'var(--forest)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Save your access</p>
              <p className="text-xs text-stone-500 mt-0.5">
                Add an email or connect Google to reach your trips from another device. Your trips and claims stay attached.
              </p>
            </div>
          </Link>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Display name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-shadow"
                onFocus={e => e.target.style.boxShadow = '0 0 0 2px #c0532a40'}
                onBlur={e => e.target.style.boxShadow = ''}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                disabled
                placeholder={isAnonymous ? 'No email yet' : ''}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm bg-stone-50 text-stone-400 cursor-not-allowed"
              />
              <p className="text-xs text-stone-400 mt-1">
                {isAnonymous ? 'Add an email via "Save your access" above.' : 'Email cannot be changed here'}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || saved}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-80"
            style={{
              background: saved ? '#fbe9d8' : 'var(--forest)',
              color: saved ? 'var(--forest)' : 'white',
            }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saved && <Check className="w-4 h-4" />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
          </button>
        </form>
      </main>
    </div>
  )
}
