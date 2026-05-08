'use client'

import { useState } from 'react'
import { Link, Check } from 'lucide-react'

export default function InviteButton({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-500 font-mono truncate bg-stone-50">
        {inviteUrl}
      </div>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-all shrink-0"
        style={{ background: copied ? '#e8f5e2' : 'var(--forest)', color: copied ? 'var(--forest)' : 'white' }}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  )
}
