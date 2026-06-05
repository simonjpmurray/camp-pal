'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { track } from '@vercel/analytics/react'
import { createClient } from '@/lib/supabase/client'

/**
 * Signs the visitor in anonymously on first load if they have no session.
 * This is what makes the app friction-free: no login wall, every visitor gets
 * a real Supabase user (with an `is_anonymous` JWT claim) so all the existing
 * RLS policies keyed on `auth.uid()` keep working.
 *
 * After a successful sign-in we `router.refresh()` so server components that ran
 * before the cookie existed (e.g. a deep-link straight to /dashboard) re-render
 * with the new session instead of bouncing to /login.
 *
 * If this fails silently the whole app looks broken with no explanation — the
 * usual cause is forgetting to enable Authentication → Providers → Anonymous
 * Sign-ins in the Supabase dashboard — so surface the error to the console.
 */
export function AnonymousAuth() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) return
      supabase.auth.signInAnonymously().then(({ error }) => {
        if (error) {
          console.error(
            '[CampFire] Anonymous sign-in failed. Is "Anonymous Sign-ins" ' +
              'enabled in Supabase → Authentication → Providers?',
            error.message
          )
          return
        }
        track('anon_session_created')
        router.refresh()
      })
    })
  }, [router])

  return null
}
