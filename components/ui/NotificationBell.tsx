'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Check } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { Notification } from '@/types/database'

export default function NotificationBell() {
  const supabase = createClient()
  const supabaseRef = useRef(supabase)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    const sb = supabaseRef.current
    sb.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return
      setUserId(data.user.id)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!userId) return
    const sb = supabaseRef.current
    let cancelled = false

    async function load() {
      const { data } = await sb
        .from('notifications')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(20)
      if (!cancelled && data) setNotifications(data)
    }
    load()

    const channel = sb
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 20))
        }
      )
      .subscribe()
    return () => { cancelled = true; sb.removeChannel(channel) }
  }, [userId])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const unreadCount = notifications.filter(n => !n.read).length

  async function markAllRead() {
    if (!userId) return
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (!unreadIds.length) return
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ background: 'var(--forest)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-2xl border border-stone-200 shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 sticky top-0 bg-white">
            <span className="text-sm font-semibold text-stone-700">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium flex items-center gap-1 text-stone-500 hover:text-stone-700"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-stone-400">
              No notifications yet
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {notifications.map(n => (
                <li key={n.id}>
                  <Link
                    href={`/trips/${n.trip_id}`}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 hover:bg-stone-50 transition-colors ${n.read ? '' : 'bg-amber-50/50'}`}
                  >
                    <p className="text-sm text-stone-700 leading-snug">{n.message}</p>
                    <p className="text-xs text-stone-400 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
