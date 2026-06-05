'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { safeRedirect } from '@/lib/safe-redirect'
import { Flame, Mail, Lock, AlertCircle, Check } from 'lucide-react'
import Link from 'next/link'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-8 h-8 border-2 border-stone-300 border-t-transparent rounded-full animate-spin" style={{ borderTopColor: 'var(--forest)' }} />
    </div>
  )
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Flame className="w-8 h-8" style={{ color: 'var(--forest)' }} />
          <span className="font-display text-2xl font-semibold" style={{ color: 'var(--forest)' }}>CampFire</span>
        </Link>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
          <h1 className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>{title}</h1>
          <p className="text-sm text-stone-500 mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

const inputClass = 'w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-shadow'
function focusRing(e: React.FocusEvent<HTMLInputElement>) { e.target.style.boxShadow = '0 0 0 2px #c0532a40' }
function blurRing(e: React.FocusEvent<HTMLInputElement>) { e.target.style.boxShadow = '' }

function GoogleButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 border border-stone-200 rounded-xl py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {label}
    </button>
  )
}

/**
 * Shown to anonymous users. Upgrades their existing account in place (same UUID,
 * so trips and claims stay attached) by adding an email + password identity, or
 * by linking Google. This is the "save your access" path — there is no data loss.
 */
function UpgradeForm() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    // updateUser adds the email/password identity to the current anonymous user.
    // If email confirmations are on, Supabase emails a confirmation link; the
    // account becomes permanent once confirmed. The password is set now so they
    // can sign in from another device afterwards.
    const { error } = await supabase.auth.updateUser({ email, password })
    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email to confirm, then you can sign in from any device with this email and password.')
    }
    setLoading(false)
  }

  async function handleGoogleLink() {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=/dashboard` },
    })
    if (error) setError(error.message)
  }

  return (
    <Shell title="Save your access" subtitle="Add an email or connect Google so you can reach your trips from another device. Your trips and claims stay attached.">
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {message && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-4">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="you@example.com" className={inputClass.replace('px-4', 'pl-10 pr-4')}
              onFocus={focusRing} onBlur={blurRing} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              minLength={6} placeholder="••••••••" className={inputClass.replace('px-4', 'pl-10 pr-4')}
              onFocus={focusRing} onBlur={blurRing} />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full text-white py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
          style={{ background: 'var(--forest)' }}>
          {loading ? 'Saving…' : 'Save with email'}
        </button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
        <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-stone-400">or</span></div>
      </div>

      <GoogleButton onClick={handleGoogleLink} label="Connect Google" />

      <p className="text-center text-sm text-stone-500 mt-5">
        <Link href="/dashboard" className="font-medium" style={{ color: 'var(--forest)' }}>Maybe later — back to my trips</Link>
      </p>
    </Shell>
  )
}

/** Shown to fully signed-out visitors (they explicitly logged out). */
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSignup = searchParams.get('signup') === 'true'
  const redirectTo = safeRedirect(searchParams.get('redirectTo'))

  const [mode, setMode] = useState<'login' | 'signup'>(isSignup ? 'signup' : 'login')
  const [lastSignup, setLastSignup] = useState(isSignup)
  if (lastSignup !== isSignup) {
    setLastSignup(isSignup)
    setMode(isSignup ? 'signup' : 'login')
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}`,
        },
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email to confirm your account, then sign in.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push(redirectTo)
        router.refresh()
      }
    }

    setLoading(false)
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}` },
    })
    if (error) setError(error.message)
  }

  return (
    <Shell
      title={mode === 'login' ? 'Welcome back' : 'Create account'}
      subtitle={mode === 'login' ? 'Sign in to your CampFire account' : 'Start planning your next adventure'}
    >
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {message && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-4">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="Your name" className={inputClass} onFocus={focusRing} onBlur={blurRing} />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="you@example.com" className={inputClass.replace('px-4', 'pl-10 pr-4')}
              onFocus={focusRing} onBlur={blurRing} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              minLength={6} placeholder="••••••••" className={inputClass.replace('px-4', 'pl-10 pr-4')}
              onFocus={focusRing} onBlur={blurRing} />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full text-white py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-60"
          style={{ background: 'var(--forest)' }}>
          {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
        <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-stone-400">or</span></div>
      </div>

      <GoogleButton onClick={handleGoogleLogin} label="Continue with Google" />

    </Shell>
  )
}

/** Shown when a real (non-anonymous) account is already signed in. */
function AlreadySignedIn() {
  return (
    <Shell title="You're all set" subtitle="Your account is saved — you can reach your trips from any device.">
      <Link href="/dashboard"
        className="w-full flex items-center justify-center gap-2 text-white py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        style={{ background: 'var(--forest)' }}>
        <Check className="w-4 h-4" /> Go to my trips
      </Link>
    </Shell>
  )
}

type AuthState = 'loading' | 'anonymous' | 'signed-in' | 'signed-out'

function LoginRouter() {
  const [state, setState] = useState<AuthState>('loading')

  useEffect(() => {
    const supabase = createClient()
    function resolve() {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) setState('signed-out')
        else if (user.is_anonymous) setState('anonymous')
        else setState('signed-in')
      })
    }
    resolve()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => resolve())
    return () => subscription.unsubscribe()
  }, [])

  if (state === 'loading') return <Spinner />
  if (state === 'anonymous') return <UpgradeForm />
  if (state === 'signed-in') return <AlreadySignedIn />
  return <LoginForm />
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginRouter />
    </Suspense>
  )
}
