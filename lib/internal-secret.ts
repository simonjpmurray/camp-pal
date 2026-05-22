export function getInternalSecret(): string {
  const secret = process.env.INTERNAL_WEBHOOK_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('INTERNAL_WEBHOOK_SECRET env var must be set (>= 32 chars).')
  }
  return secret
}

export function isInternalRequest(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const provided = authHeader.slice('Bearer '.length).trim()
  let expected: string
  try {
    expected = getInternalSecret()
  } catch {
    return false
  }
  if (provided.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}
