'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/trips/MemberList'
import { format } from 'date-fns'
import { Send, Pin, PinOff } from 'lucide-react'

interface Message {
  id: string
  trip_id: string
  user_id: string
  content: string
  pinned: boolean
  created_at: string
  users: { id: string; name: string; avatar_url: string | null } | null
}

interface Props {
  tripId: string
  currentUserId: string
  currentUser: { name: string; avatar_url: string | null }
  isCreator: boolean
  initialMessages: Message[]
}

export default function ChatClient({ tripId, currentUserId, currentUser, isCreator, initialMessages }: Props) {
  const supabase = createClient()
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${tripId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `trip_id=eq.${tripId}` },
        async (payload) => {
          // Fetch user details for the new message
          const { data: msg } = await supabase
            .from('messages')
            .select('*, users(id, name, avatar_url)')
            .eq('id', payload.new.id)
            .single()
          if (msg) setMessages(prev => [...prev, msg as Message])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `trip_id=eq.${tripId}` },
        (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tripId, supabase])

  async function sendMessage() {
    if (!input.trim()) return
    setSending(true)
    const content = input.trim()
    setInput('')

    await supabase.from('messages').insert({
      trip_id: tripId,
      user_id: currentUserId,
      content,
      pinned: false,
    })

    setSending(false)
    inputRef.current?.focus()
  }

  async function togglePin(msg: Message) {
    await supabase
      .from('messages')
      .update({ pinned: !msg.pinned })
      .eq('id', msg.id)
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pinned: !m.pinned } : m))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const pinnedMessages = messages.filter(m => m.pinned)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Pinned messages */}
      {pinnedMessages.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 shrink-0">
          <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1">
            <Pin className="w-3 h-3" /> Pinned
          </p>
          {pinnedMessages.map(m => (
            <p key={m.id} className="text-xs text-amber-800 truncate">{m.users?.name}: {m.content}</p>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center text-stone-400 text-sm py-12">
            No messages yet — say hi to your crew! 👋
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.user_id === currentUserId
          const prevMsg = messages[i - 1]
          const isSameAuthor = prevMsg?.user_id === msg.user_id &&
            (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) < 5 * 60 * 1000
          const user = msg.users ?? { name: 'Unknown', avatar_url: null, id: msg.user_id }

          return (
            <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''} group`}>
              {!isSameAuthor && !isMe && (
                <Avatar user={user} size="sm" />
              )}
              {isSameAuthor && !isMe && <div className="w-7 shrink-0" />}

              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isSameAuthor && !isMe && (
                  <span className="text-xs font-medium text-stone-500 ml-1">{user.name}</span>
                )}
                <div className="flex items-end gap-1.5">
                  {msg.pinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'text-white rounded-tr-sm'
                        : 'bg-white border border-stone-100 text-stone-800 rounded-tl-sm'
                    }`}
                    style={isMe ? { background: 'var(--forest)' } : {}}
                  >
                    {msg.content}
                  </div>
                </div>
                <span className="text-xs text-stone-400 px-1">
                  {format(new Date(msg.created_at), 'HH:mm')}
                </span>
              </div>

              {/* Pin action (creator only) */}
              {isCreator && (
                <button
                  onClick={() => togglePin(msg)}
                  className="opacity-0 group-hover:opacity-100 self-center p-1 rounded-lg hover:bg-stone-100 transition-all text-stone-400 hover:text-amber-500"
                >
                  {msg.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-stone-200 bg-white px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <Avatar user={currentUser} size="sm" />
          <div className="flex-1 border border-stone-200 rounded-2xl overflow-hidden flex items-end"
            style={{ background: '#fafaf9' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message the group…"
              rows={1}
              className="flex-1 px-4 py-2.5 text-sm resize-none outline-none bg-transparent max-h-32"
              style={{ lineHeight: '1.4' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-opacity disabled:opacity-40 shrink-0"
            style={{ background: 'var(--forest)' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
