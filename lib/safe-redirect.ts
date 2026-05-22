const FALLBACK = '/dashboard'

export function safeRedirect(path: string | null | undefined, fallback: string = FALLBACK): string {
  if (!path) return fallback
  if (!path.startsWith('/')) return fallback
  if (path.startsWith('//')) return fallback
  if (path.startsWith('/\\')) return fallback
  return path
}
