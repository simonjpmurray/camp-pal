import { headers } from 'next/headers'

export async function getAppUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  const h = await headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') || 'http'
  if (host) return `${proto}://${host}`

  throw new Error('Cannot determine app URL: set NEXT_PUBLIC_APP_URL or call from a request context.')
}
