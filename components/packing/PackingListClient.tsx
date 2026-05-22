'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PackingItem, ItemType, ScaledMultiplier } from '@/types/database'
import { CATEGORIES, scaleQuantity } from '@/lib/packing'
import { Plus, RefreshCw, ChevronDown, ChevronUp, Check, Users, User as UserIcon, BarChart3 } from 'lucide-react'
import { Avatar } from '@/components/trips/MemberList'

interface Claim {
  id: string
  item_id: string
  trip_id: string
  user_id: string
  quantity_claimed: number
  confirmed: boolean
  created_at: string
  users: { id: string; name: string; avatar_url: string | null } | null
}

interface Member {
  id: string
  name: string
  avatar_url: string | null
}

interface Props {
  tripId: string
  currentUserId: string
  isCreator: boolean
  initialItems: PackingItem[]
  initialClaims: Claim[]
  members: Member[]
  nightCount: number
}

type Filter = 'all' | 'unclaimed' | 'mine' | 'covered'

const HIGHLIGHT_COLORS = {
  red: { bg: '#fff0f0', border: '#fecaca', badge: 'bg-red-100 text-red-700' },
  yellow: { bg: '#fffbf0', border: '#fde68a', badge: 'bg-amber-100 text-amber-700' },
  grey: { bg: 'white', border: '#e7e5e4', badge: 'bg-stone-100 text-stone-500' },
}

const TYPE_META: Record<ItemType, { label: string; pill: string; icon: typeof Users }> = {
  group: { label: 'Group', pill: 'bg-blue-50 text-blue-700 border-blue-200', icon: Users },
  personal: { label: 'Individual', pill: 'bg-purple-50 text-purple-700 border-purple-200', icon: UserIcon },
  scaled: { label: 'Scaled', pill: 'bg-amber-50 text-amber-700 border-amber-200', icon: BarChart3 },
}

const SCALED_LABEL: Record<ScaledMultiplier, string> = {
  per_person: 'per person',
  per_night: 'per night',
  per_person_per_night: 'per person/night',
}

const TYPE_CYCLE: ItemType[] = ['group', 'personal', 'scaled']

function getItemType(item: PackingItem): ItemType {
  return item.item_type ?? 'group'
}

function highlightLabel(level: PackingItem['weather_highlight']) {
  return level === 'red' ? 'Must-bring' : level === 'yellow' ? 'Recommended' : 'Optional'
}

function ItemTypeBadge({
  item,
  isCreator,
  onTypeChange,
}: {
  item: PackingItem
  isCreator: boolean
  onTypeChange: (newType: ItemType) => void
}) {
  const type = getItemType(item)
  const meta = TYPE_META[type]
  const Icon = meta.icon
  const Tag = isCreator ? 'button' : 'span'

  function cycle() {
    if (!isCreator) return
    const next = TYPE_CYCLE[(TYPE_CYCLE.indexOf(type) + 1) % TYPE_CYCLE.length]
    onTypeChange(next)
  }

  return (
    <Tag
      onClick={isCreator ? cycle : undefined}
      title={isCreator ? 'Click to change type' : `Item type: ${meta.label}`}
      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border font-medium ${meta.pill} ${
        isCreator ? 'cursor-pointer hover:opacity-80' : ''
      }`}
    >
      <Icon className="w-3 h-3" />
      {meta.label}
    </Tag>
  )
}

function GroupItemRow({
  item,
  claims,
  currentUserId,
  tripId,
  isCreator,
  memberCount,
  nightCount,
  onClaimsChange,
  onItemUpdate,
}: {
  item: PackingItem
  claims: Claim[]
  currentUserId: string
  tripId: string
  isCreator: boolean
  memberCount: number
  nightCount: number
  onClaimsChange: (itemId: string, newClaims: Claim[]) => void
  onItemUpdate: (item: PackingItem) => void
}) {
  const supabase = createClient()
  const myClaim = claims.find(c => c.user_id === currentUserId)
  const totalClaimed = claims.reduce((s, c) => s + c.quantity_claimed, 0)
  const isCovered = totalClaimed >= item.quantity
  const [editing, setEditing] = useState(false)
  const [qty, setQty] = useState(myClaim?.quantity_claimed ?? 1)
  const [editingItemQty, setEditingItemQty] = useState(false)
  const [itemQty, setItemQty] = useState(item.quantity)
  const [loading, setLoading] = useState(false)

  const isScaled = getItemType(item) === 'scaled'
  const suggestedQty = isScaled
    ? scaleQuantity(1, item.scaled_multiplier, memberCount, nightCount)
    : null

  async function claimItem() {
    setLoading(true)
    const { data } = await supabase
      .from('item_claims')
      .insert({ item_id: item.id, trip_id: tripId, user_id: currentUserId, quantity_claimed: qty, confirmed: true })
      .select('*, users(id, name, avatar_url)')
      .single()
    if (data) onClaimsChange(item.id, [...claims, data as Claim])
    setEditing(false)
    setLoading(false)
  }

  async function updateClaim() {
    if (!myClaim) return
    setLoading(true)
    const { data } = await supabase
      .from('item_claims')
      .update({ quantity_claimed: qty })
      .eq('id', myClaim.id)
      .select('*, users(id, name, avatar_url)')
      .single()
    if (data) onClaimsChange(item.id, claims.map(c => c.id === myClaim.id ? data as Claim : c))
    setEditing(false)
    setLoading(false)
  }

  async function unclaim() {
    if (!myClaim) return
    setLoading(true)
    await supabase.from('item_claims').delete().eq('id', myClaim.id)
    onClaimsChange(item.id, claims.filter(c => c.id !== myClaim.id))
    setLoading(false)
  }

  async function saveItemQty() {
    setLoading(true)
    const { data } = await supabase
      .from('packing_items')
      .update({ quantity: Math.max(1, itemQty) })
      .eq('id', item.id)
      .select()
      .single()
    if (data) onItemUpdate(data as PackingItem)
    setEditingItemQty(false)
    setLoading(false)
  }

  const colors = HIGHLIGHT_COLORS[item.weather_highlight]

  return (
    <div className="rounded-xl border p-3.5 transition-all"
      style={{ background: colors.bg, borderColor: colors.border }}>
      <div className="flex items-start gap-3">
        <div className={`w-5 h-5 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
          isCovered ? 'border-green-500 bg-green-500' : 'border-stone-300'
        }`}>
          {isCovered && <Check className="w-3 h-3 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-stone-800">{item.name}</span>
            {item.quantity > 1 && !editingItemQty && (
              <span className="text-xs text-stone-400">×{item.quantity} needed</span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colors.badge}`}>
              {highlightLabel(item.weather_highlight)}
            </span>
            <ItemTypeBadge
              item={item}
              isCreator={isCreator}
              onTypeChange={async (newType) => {
                const update: { item_type: ItemType; scaled_multiplier?: ScaledMultiplier | null } = { item_type: newType }
                if (newType !== 'scaled') update.scaled_multiplier = null
                else if (!item.scaled_multiplier) update.scaled_multiplier = 'per_person'
                const { data } = await supabase
                  .from('packing_items')
                  .update(update)
                  .eq('id', item.id)
                  .select()
                  .single()
                if (data) onItemUpdate(data as PackingItem)
              }}
            />
          </div>

          {isScaled && (
            <p className="text-xs text-amber-700 mt-1">
              Scaled {item.scaled_multiplier ? `(${SCALED_LABEL[item.scaled_multiplier]})` : ''} — suggested {suggestedQty} for {memberCount} {memberCount === 1 ? 'person' : 'people'}, {nightCount} {nightCount === 1 ? 'night' : 'nights'}
            </p>
          )}

          {item.highlight_reason && (
            <p className="text-xs text-stone-500 mt-0.5">{item.highlight_reason}</p>
          )}

          {/* Quantity override (creator-only) */}
          {isCreator && (
            <div className="mt-1.5">
              {editingItemQty ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">Total needed:</span>
                  <div className="flex items-center gap-1 border border-stone-200 rounded-lg overflow-hidden bg-white">
                    <button onClick={() => setItemQty(q => Math.max(1, q - 1))} className="px-2 py-0.5 text-stone-500 hover:bg-stone-50">−</button>
                    <span className="px-2 text-xs font-medium text-stone-700">{itemQty}</span>
                    <button onClick={() => setItemQty(q => q + 1)} className="px-2 py-0.5 text-stone-500 hover:bg-stone-50">+</button>
                  </div>
                  <button onClick={saveItemQty} disabled={loading} className="text-xs font-medium px-2 py-0.5 rounded-lg text-white" style={{ background: 'var(--forest)' }}>
                    {loading ? '…' : 'Save'}
                  </button>
                  <button onClick={() => { setEditingItemQty(false); setItemQty(item.quantity) }} className="text-xs text-stone-400">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setEditingItemQty(true)} className="text-xs text-stone-400 underline hover:text-stone-600">
                  Override quantity
                </button>
              )}
            </div>
          )}

          {/* Claimers */}
          {claims.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {claims.map(c => c.users && (
                <div key={c.id} className="flex items-center gap-1 text-xs bg-white rounded-full px-2 py-0.5 border border-stone-200 shadow-sm">
                  <Avatar user={c.users} size="sm" />
                  <span className="text-stone-600">{c.users.name.split(' ')[0]}</span>
                  {c.quantity_claimed > 1 && <span className="text-stone-400">×{c.quantity_claimed}</span>}
                </div>
              ))}
              <span className="text-xs text-stone-400">
                {totalClaimed}/{item.quantity} claimed
              </span>
            </div>
          )}

          {/* My claim controls */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {!myClaim && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                style={{ background: '#fbe9d8', color: 'var(--forest)' }}
              >
                + I&apos;ll bring this
              </button>
            )}

            {(editing || myClaim) && (
              <div className="flex items-center gap-2 flex-wrap">
                {editing ? (
                  <>
                    <div className="flex items-center gap-1 border border-stone-200 rounded-lg overflow-hidden bg-white">
                      <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-2 py-1 text-stone-500 hover:bg-stone-50">−</button>
                      <span className="px-2 text-sm font-medium text-stone-700">{qty}</span>
                      <button onClick={() => setQty(q => q + 1)} className="px-2 py-1 text-stone-500 hover:bg-stone-50">+</button>
                    </div>
                    <button
                      onClick={myClaim ? updateClaim : claimItem}
                      disabled={loading}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg text-white transition-opacity disabled:opacity-60"
                      style={{ background: 'var(--forest)' }}
                    >
                      {loading ? '…' : 'Confirm'}
                    </button>
                    <button onClick={() => setEditing(false)} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
                  </>
                ) : myClaim ? (
                  <>
                    <span className="text-xs text-stone-500">
                      You: ×{myClaim.quantity_claimed}
                    </span>
                    <button onClick={() => { setQty(myClaim.quantity_claimed); setEditing(true) }}
                      className="text-xs text-stone-400 underline hover:text-stone-600">
                      Edit
                    </button>
                    <button onClick={unclaim} className="text-xs text-red-400 underline hover:text-red-600">
                      Unclaim
                    </button>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PersonalItemRow({
  item,
  claims,
  currentUserId,
  tripId,
  members,
  isCreator,
  onClaimsChange,
  onItemUpdate,
}: {
  item: PackingItem
  claims: Claim[]
  currentUserId: string
  tripId: string
  members: Member[]
  isCreator: boolean
  onClaimsChange: (itemId: string, newClaims: Claim[]) => void
  onItemUpdate: (item: PackingItem) => void
}) {
  const supabase = createClient()
  const myClaim = claims.find(c => c.user_id === currentUserId)
  const confirmedCount = claims.filter(c => c.confirmed).length
  const memberCount = members.length
  const allConfirmed = memberCount > 0 && confirmedCount >= memberCount
  const [loading, setLoading] = useState(false)

  async function confirmMine() {
    setLoading(true)
    const { data } = await supabase
      .from('item_claims')
      .insert({ item_id: item.id, trip_id: tripId, user_id: currentUserId, quantity_claimed: 1, confirmed: true })
      .select('*, users(id, name, avatar_url)')
      .single()
    if (data) onClaimsChange(item.id, [...claims, data as Claim])
    setLoading(false)
  }

  async function unconfirmMine() {
    if (!myClaim) return
    setLoading(true)
    await supabase.from('item_claims').delete().eq('id', myClaim.id)
    onClaimsChange(item.id, claims.filter(c => c.id !== myClaim.id))
    setLoading(false)
  }

  const colors = HIGHLIGHT_COLORS[item.weather_highlight]

  return (
    <div className="rounded-xl border p-3.5 transition-all"
      style={{ background: colors.bg, borderColor: colors.border }}>
      <div className="flex items-start gap-3">
        <div className={`w-5 h-5 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
          allConfirmed ? 'border-green-500 bg-green-500' : 'border-stone-300'
        }`}>
          {allConfirmed && <Check className="w-3 h-3 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-stone-800">{item.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colors.badge}`}>
              {highlightLabel(item.weather_highlight)}
            </span>
            <ItemTypeBadge
              item={item}
              isCreator={isCreator}
              onTypeChange={async (newType) => {
                const update: { item_type: ItemType; scaled_multiplier?: ScaledMultiplier | null } = { item_type: newType }
                if (newType !== 'scaled') update.scaled_multiplier = null
                else if (!item.scaled_multiplier) update.scaled_multiplier = 'per_person'
                const { data } = await supabase
                  .from('packing_items')
                  .update(update)
                  .eq('id', item.id)
                  .select()
                  .single()
                if (data) onItemUpdate(data as PackingItem)
              }}
            />
          </div>

          {item.highlight_reason && (
            <p className="text-xs text-stone-500 mt-0.5">{item.highlight_reason}</p>
          )}

          {/* Per-member confirmation grid */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {members.map(member => {
              const claim = claims.find(c => c.user_id === member.id)
              const confirmed = !!claim?.confirmed
              const isMe = member.id === currentUserId
              return (
                <div
                  key={member.id}
                  title={`${member.name}${confirmed ? ' — packed' : ' — not yet'}`}
                  className={`relative rounded-full ${
                    isMe ? 'ring-2 ring-offset-1' : ''
                  }`}
                  style={isMe ? { boxShadow: confirmed ? 'inset 0 0 0 2px rgb(34, 197, 94)' : 'inset 0 0 0 2px rgb(214, 211, 209)' } : {}}
                >
                  <div className={`rounded-full ${confirmed ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                    <Avatar user={member} size="sm" />
                  </div>
                  {confirmed && (
                    <span className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full w-3 h-3 flex items-center justify-center border border-white">
                      <Check className="w-2 h-2 text-white" strokeWidth={3} />
                    </span>
                  )}
                </div>
              )
            })}
            <span className="text-xs text-stone-400 ml-1">
              {confirmedCount}/{memberCount} confirmed
            </span>
          </div>

          {/* My confirm/unconfirm */}
          <div className="mt-2">
            {!myClaim ? (
              <button
                onClick={confirmMine}
                disabled={loading}
                className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-60"
                style={{ background: '#fbe9d8', color: 'var(--forest)' }}
              >
                {loading ? '…' : '✓ Mark as packed'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-700 font-medium">✓ You&apos;re bringing this</span>
                <button
                  onClick={unconfirmMine}
                  disabled={loading}
                  className="text-xs text-red-400 underline hover:text-red-600"
                >
                  Unmark
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PackingListClient({
  tripId,
  currentUserId,
  isCreator,
  initialItems,
  initialClaims,
  members,
  nightCount,
}: Props) {
  const supabase = createClient()
  const [items, setItems] = useState(initialItems)
  const [claims, setClaims] = useState(initialClaims)
  const [filter, setFilter] = useState<Filter>('all')
  const [activeTab, setActiveTab] = useState<'group' | 'individual'>('group')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState(CATEGORIES[0])
  const [newItemQty, setNewItemQty] = useState(1)
  const [newItemType, setNewItemType] = useState<ItemType>('group')
  const [newItemMultiplier, setNewItemMultiplier] = useState<ScaledMultiplier>('per_person')

  const memberCount = Math.max(1, members.length)
  const supabaseRef = useRef(supabase)

  function handleClaimsChange(itemId: string, newClaims: Claim[]) {
    setClaims(prev => {
      const byId = new Map(prev.map(c => [c.id, c]))
      for (const c of newClaims) byId.set(c.id, c)
      // Drop any stale claims for this item that weren't included in newClaims.
      const incomingIds = new Set(newClaims.map(c => c.id))
      return Array.from(byId.values()).filter(c => c.item_id !== itemId || incomingIds.has(c.id))
    })
  }

  function handleItemUpdate(updated: PackingItem) {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  // Realtime: keep claims in sync when other members claim/unclaim items.
  useEffect(() => {
    const sb = supabaseRef.current
    const channel = sb
      .channel(`packing-claims:${tripId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'item_claims', filter: `trip_id=eq.${tripId}` },
        async (payload) => {
          const newRow = payload.new as { id: string }
          const { data } = await sb
            .from('item_claims')
            .select('*, users(id, name, avatar_url)')
            .eq('id', newRow.id)
            .maybeSingle()
          if (data) setClaims(prev => prev.some(c => c.id === data.id) ? prev : [...prev, data as Claim])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'item_claims', filter: `trip_id=eq.${tripId}` },
        async (payload) => {
          const updated = payload.new as { id: string }
          const { data } = await sb
            .from('item_claims')
            .select('*, users(id, name, avatar_url)')
            .eq('id', updated.id)
            .maybeSingle()
          if (data) setClaims(prev => prev.map(c => c.id === data.id ? data as Claim : c))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'item_claims', filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const deleted = payload.old as { id: string }
          setClaims(prev => prev.filter(c => c.id !== deleted.id))
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'packing_items', filter: `trip_id=eq.${tripId}` },
        async () => {
          const { data } = await sb
            .from('packing_items')
            .select('*')
            .eq('trip_id', tripId)
            .order('category')
            .order('name')
          if (data) setItems(data)
        }
      )
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [tripId])

  const claimsByItem = useMemo(() => {
    const map: Record<string, Claim[]> = {}
    claims.forEach(c => {
      if (!map[c.item_id]) map[c.item_id] = []
      map[c.item_id].push(c)
    })
    return map
  }, [claims])

  const isCovered = useCallback((item: PackingItem): boolean => {
    const itemClaims = claimsByItem[item.id] ?? []
    if (getItemType(item) === 'personal') {
      const confirmed = itemClaims.filter(c => c.confirmed).length
      return members.length > 0 && confirmed >= members.length
    }
    const total = itemClaims.reduce((s, c) => s + c.quantity_claimed, 0)
    return total >= item.quantity
  }, [claimsByItem, members.length])

  const isMine = useCallback((item: PackingItem): boolean => {
    return (claimsByItem[item.id] ?? []).some(c => c.user_id === currentUserId)
  }, [claimsByItem, currentUserId])

  const passesFilter = useCallback((item: PackingItem): boolean => {
    if (filter === 'unclaimed') return !isMine(item)
    if (filter === 'mine') return isMine(item)
    if (filter === 'covered') return isCovered(item)
    return true
  }, [filter, isMine, isCovered])

  const groupItems = useMemo(
    () => items.filter(i => getItemType(i) !== 'personal').filter(passesFilter),
    [items, passesFilter]
  )

  const personalItems = useMemo(
    () => items.filter(i => getItemType(i) === 'personal').filter(passesFilter),
    [items, passesFilter]
  )

  const groupCovered = useMemo(
    () => items.filter(i => getItemType(i) !== 'personal' && isCovered(i)).length,
    [items, isCovered]
  )
  const groupTotal = items.filter(i => getItemType(i) !== 'personal').length

  const personalConfirmedByMe = useMemo(
    () => items.filter(i => getItemType(i) === 'personal' && isMine(i)).length,
    [items, isMine]
  )
  const personalTotal = items.filter(i => getItemType(i) === 'personal').length

  function categorise(list: PackingItem[]): Record<string, PackingItem[]> {
    const cats: Record<string, PackingItem[]> = {}
    list.forEach(item => {
      if (!cats[item.category]) cats[item.category] = []
      cats[item.category].push(item)
    })
    return cats
  }

  function orderedKeys(cats: Record<string, PackingItem[]>): string[] {
    return CATEGORIES.filter(c => cats[c]?.length > 0)
      .concat(Object.keys(cats).filter(c => !CATEGORIES.includes(c)))
  }

  async function regenerate() {
    setRegenerating(true)
    try {
      await fetch(`/api/trips/${tripId}/generate-packing`, { method: 'POST' })
      const [{ data: freshItems }, { data: freshClaims }] = await Promise.all([
        supabase.from('packing_items').select('*').eq('trip_id', tripId).order('category').order('name'),
        supabase.from('item_claims').select('*, users(id, name, avatar_url)').eq('trip_id', tripId),
      ])
      if (freshItems) setItems(freshItems)
      if (freshClaims) setClaims(freshClaims as Claim[])
    } finally {
      setRegenerating(false)
    }
  }

  async function addCustomItem() {
    if (!newItemName.trim()) return
    const insert = {
      trip_id: tripId,
      category: newItemCategory,
      name: newItemName.trim(),
      quantity: newItemQty,
      is_custom: true,
      weather_highlight: 'grey' as const,
      item_type: newItemType,
      scaled_multiplier: newItemType === 'scaled' ? newItemMultiplier : null,
    }
    const { data } = await supabase.from('packing_items').insert(insert).select().single()
    if (data) {
      setItems(prev => [...prev, data])
      setNewItemName('')
      setNewItemQty(1)
      setNewItemType('group')
      setAddingItem(false)
    }
  }

  function renderCategorySection(
    list: PackingItem[],
    keyPrefix: string,
    renderItem: (item: PackingItem) => React.ReactNode
  ) {
    const cats = categorise(list)
    const keys = orderedKeys(cats)
    if (keys.length === 0) {
      return (
        <div className="bg-white rounded-2xl border border-stone-100 p-6 text-center text-sm text-stone-400">
          No items match the current filter.
        </div>
      )
    }
    return (
      <div className="space-y-3">
        {keys.map(category => {
          const catItems = cats[category] ?? []
          const sectionKey = `${keyPrefix}:${category}`
          const isOpen = activeCategory === null || activeCategory === sectionKey
          return (
            <div key={sectionKey} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
              <button
                onClick={() => setActiveCategory(isOpen && activeCategory === sectionKey ? null : sectionKey)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors"
              >
                <span className="font-semibold text-sm text-stone-700">{category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{catItems.length} items</span>
                  {activeCategory === sectionKey
                    ? <ChevronUp className="w-4 h-4 text-stone-400" />
                    : <ChevronDown className="w-4 h-4 text-stone-400" />}
                </div>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                  {catItems
                    .slice()
                    .sort((a, b) => {
                      const order = { red: 0, yellow: 1, grey: 2 }
                      return order[a.weather_highlight] - order[b.weather_highlight]
                    })
                    .map(renderItem)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      {/* Summary bar */}
      <div className="bg-white rounded-2xl border border-stone-100 p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4 text-blue-600" /> {groupCovered}/{groupTotal} group items covered</span>
            </div>
            <div className="text-sm font-semibold mt-1" style={{ color: 'var(--foreground)' }}>
              <span className="inline-flex items-center gap-1.5"><UserIcon className="w-4 h-4 text-purple-600" /> {personalConfirmedByMe}/{personalTotal} individual items packed by you</span>
            </div>
            <div className="text-xs text-stone-400 mt-1">
              {memberCount} {memberCount === 1 ? 'person' : 'people'} · {nightCount} {nightCount === 1 ? 'night' : 'nights'}
            </div>
          </div>
          {isCreator && (
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(['all', 'unclaimed', 'mine', 'covered'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
              filter === f ? 'text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
            style={filter === f ? { background: 'var(--forest)' } : {}}
          >
            {f === 'all' ? 'All items' : f === 'unclaimed' ? 'Unclaimed' : f === 'mine' ? 'My items' : 'Fully covered'}
          </button>
        ))}
      </div>

      {/* Kit tabs */}
      <div className="flex gap-2 mb-4 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('group')}
          className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 -mb-px border-b-2 transition-colors ${
            activeTab === 'group'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Group Kit
          <span className="text-xs font-medium text-stone-400">({groupTotal})</span>
        </button>
        <button
          onClick={() => setActiveTab('individual')}
          className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 -mb-px border-b-2 transition-colors ${
            activeTab === 'individual'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          Individual Kit
          <span className="text-xs font-medium text-stone-400">({personalTotal})</span>
        </button>
      </div>

      {activeTab === 'group' && (
        <div className="mb-6">
          <div className="text-xs text-stone-400 mb-2 px-1">Shared equipment & supplies</div>
          {renderCategorySection(groupItems, 'group', (item) => (
            <GroupItemRow
              key={item.id}
              item={item}
              claims={claimsByItem[item.id] ?? []}
              currentUserId={currentUserId}
              tripId={tripId}
              isCreator={isCreator}
              memberCount={memberCount}
              nightCount={nightCount}
              onClaimsChange={handleClaimsChange}
              onItemUpdate={handleItemUpdate}
            />
          ))}
        </div>
      )}

      {activeTab === 'individual' && (
        <div className="mb-6">
          <div className="text-xs text-stone-400 mb-2 px-1">Each member brings their own</div>
          {renderCategorySection(personalItems, 'personal', (item) => (
            <PersonalItemRow
              key={item.id}
              item={item}
              claims={claimsByItem[item.id] ?? []}
              currentUserId={currentUserId}
              tripId={tripId}
              members={members}
              isCreator={isCreator}
              onClaimsChange={handleClaimsChange}
              onItemUpdate={handleItemUpdate}
            />
          ))}
        </div>
      )}

      {/* Add custom item */}
      <div className="mt-4">
        {!addingItem ? (
          <button
            onClick={() => setAddingItem(true)}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium py-3 rounded-xl border border-dashed border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add custom item
          </button>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
            <h3 className="font-semibold text-sm text-stone-700">Add custom item</h3>
            <input
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              placeholder="Item name"
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none"
              onFocus={e => e.target.style.boxShadow = '0 0 0 2px #c0532a40'}
              onBlur={e => e.target.style.boxShadow = ''}
            />
            <div className="flex gap-2 flex-wrap">
              <select
                value={newItemCategory}
                onChange={e => setNewItemCategory(e.target.value)}
                className="flex-1 min-w-[140px] border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={newItemType}
                onChange={e => setNewItemType(e.target.value as ItemType)}
                className="border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              >
                <option value="group">👥 Group</option>
                <option value="personal">👤 Individual</option>
                <option value="scaled">📊 Scaled</option>
              </select>
              {newItemType !== 'scaled' && (
                <div className="flex items-center gap-1 border border-stone-200 rounded-xl overflow-hidden">
                  <button onClick={() => setNewItemQty(q => Math.max(1, q - 1))} className="px-3 py-2 text-stone-500 hover:bg-stone-50">−</button>
                  <span className="px-2 text-sm font-medium">{newItemQty}</span>
                  <button onClick={() => setNewItemQty(q => q + 1)} className="px-3 py-2 text-stone-500 hover:bg-stone-50">+</button>
                </div>
              )}
            </div>
            {newItemType === 'scaled' && (
              <select
                value={newItemMultiplier}
                onChange={e => setNewItemMultiplier(e.target.value as ScaledMultiplier)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              >
                <option value="per_person">Per person</option>
                <option value="per_night">Per night</option>
                <option value="per_person_per_night">Per person per night</option>
              </select>
            )}
            <div className="flex gap-2">
              <button
                onClick={addCustomItem}
                className="flex-1 text-sm font-medium py-2 rounded-xl text-white"
                style={{ background: 'var(--forest)' }}
              >
                Add item
              </button>
              <button
                onClick={() => setAddingItem(false)}
                className="px-4 text-sm text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
