'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PackingItem } from '@/types/database'
import { CATEGORIES } from '@/lib/packing'
import { Plus, RefreshCw, ChevronDown, ChevronUp, Check } from 'lucide-react'
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

interface Props {
  tripId: string
  currentUserId: string
  isCreator: boolean
  initialItems: PackingItem[]
  initialClaims: Claim[]
  members: Array<{ id: string; name: string; avatar_url: string | null }>
}

type Filter = 'all' | 'unclaimed' | 'mine' | 'covered'

const HIGHLIGHT_COLORS = {
  red: { bg: '#fff0f0', border: '#fecaca', badge: 'bg-red-100 text-red-700', label: '🟥 Must-bring' },
  yellow: { bg: '#fffbf0', border: '#fde68a', badge: 'bg-amber-100 text-amber-700', label: '🟨 Recommended' },
  grey: { bg: 'white', border: '#e7e5e4', badge: 'bg-stone-100 text-stone-500', label: '⬜ Optional' },
}

function ClaimRow({
  item,
  claims,
  currentUserId,
  tripId,
  onClaimsChange,
}: {
  item: PackingItem
  claims: Claim[]
  currentUserId: string
  tripId: string
  onClaimsChange: (itemId: string, newClaims: Claim[]) => void
}) {
  const supabase = createClient()
  const myClaim = claims.find(c => c.user_id === currentUserId)
  const totalClaimed = claims.reduce((s, c) => s + c.quantity_claimed, 0)
  const isCovered = totalClaimed >= item.quantity
  const [editing, setEditing] = useState(false)
  const [qty, setQty] = useState(myClaim?.quantity_claimed ?? 1)
  const [loading, setLoading] = useState(false)

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

  const colors = HIGHLIGHT_COLORS[item.weather_highlight]

  return (
    <div className="rounded-xl border p-3.5 transition-all"
      style={{ background: colors.bg, borderColor: colors.border }}>
      <div className="flex items-start gap-3">
        {/* Check circle */}
        <div className={`w-5 h-5 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
          isCovered ? 'border-green-500 bg-green-500' : 'border-stone-300'
        }`}>
          {isCovered && <Check className="w-3 h-3 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-stone-800">{item.name}</span>
            {item.quantity > 1 && (
              <span className="text-xs text-stone-400">×{item.quantity} needed</span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colors.badge}`}>
              {item.weather_highlight === 'red' ? 'Must-bring' : item.weather_highlight === 'yellow' ? 'Recommended' : 'Optional'}
            </span>
          </div>

          {item.highlight_reason && (
            <p className="text-xs text-stone-500 mt-0.5">{item.highlight_reason}</p>
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
          <div className="mt-2 flex items-center gap-2">
            {!myClaim && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                style={{ background: '#e8f5e2', color: 'var(--forest)' }}
              >
                + I&apos;ll bring this
              </button>
            )}

            {(editing || myClaim) && (
              <div className="flex items-center gap-2">
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

export default function PackingListClient({ tripId, currentUserId, isCreator, initialItems, initialClaims, members }: Props) {
  const supabase = createClient()
  const [items, setItems] = useState(initialItems)
  const [claims, setClaims] = useState(initialClaims)
  const [filter, setFilter] = useState<Filter>('all')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState(CATEGORIES[0])
  const [newItemQty, setNewItemQty] = useState(1)

  function handleClaimsChange(itemId: string, newClaims: Claim[]) {
    setClaims(prev => [...prev.filter(c => c.item_id !== itemId), ...newClaims])
  }

  const claimsByItem = useMemo(() => {
    const map: Record<string, Claim[]> = {}
    claims.forEach(c => {
      if (!map[c.item_id]) map[c.item_id] = []
      map[c.item_id].push(c)
    })
    return map
  }, [claims])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const itemClaims = claimsByItem[item.id] ?? []
      const totalClaimed = itemClaims.reduce((s, c) => s + c.quantity_claimed, 0)
      const isCovered = totalClaimed >= item.quantity
      const isMine = itemClaims.some(c => c.user_id === currentUserId)

      if (filter === 'unclaimed') return !isMine
      if (filter === 'mine') return isMine
      if (filter === 'covered') return isCovered
      return true
    })
  }, [items, claims, filter, currentUserId, claimsByItem])

  const coveredCount = useMemo(() => {
    return items.filter(item => {
      const itemClaims = claimsByItem[item.id] ?? []
      return itemClaims.reduce((s, c) => s + c.quantity_claimed, 0) >= item.quantity
    }).length
  }, [items, claimsByItem])

  const categorisedItems = useMemo(() => {
    const cats: Record<string, PackingItem[]> = {}
    filteredItems.forEach(item => {
      if (!cats[item.category]) cats[item.category] = []
      cats[item.category].push(item)
    })
    return cats
  }, [filteredItems])

  async function regenerate() {
    setRegenerating(true)
    await fetch(`/api/trips/${tripId}/generate-packing`, { method: 'POST' })
    window.location.reload()
  }

  async function addCustomItem() {
    if (!newItemName.trim()) return
    const { data } = await supabase.from('packing_items').insert({
      trip_id: tripId,
      category: newItemCategory,
      name: newItemName.trim(),
      quantity: newItemQty,
      is_custom: true,
      weather_highlight: 'grey',
    }).select().single()
    if (data) {
      setItems(prev => [...prev, data])
      setNewItemName('')
      setNewItemQty(1)
      setAddingItem(false)
    }
  }

  const orderedCategories = CATEGORIES.filter(c => categorisedItems[c]?.length > 0)
    .concat(Object.keys(categorisedItems).filter(c => !CATEGORIES.includes(c)))

  return (
    <div>
      {/* Summary bar */}
      <div className="bg-white rounded-2xl border border-stone-100 p-4 mb-4 flex items-center justify-between">
        <div>
          <span className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
            {coveredCount} of {items.length} items fully covered
          </span>
          <div className="text-xs text-stone-400 mt-0.5">
            {items.filter(i => i.weather_highlight === 'red').length} must-bring · {items.filter(i => i.weather_highlight === 'yellow').length} recommended
          </div>
        </div>
        {isCreator && (
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        )}
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

      {/* Items by category */}
      <div className="space-y-3">
        {orderedCategories.map(category => {
          const catItems = categorisedItems[category] ?? []
          const isOpen = activeCategory === null || activeCategory === category

          return (
            <div key={category} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
              <button
                onClick={() => setActiveCategory(isOpen && activeCategory === category ? null : category)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors"
              >
                <span className="font-semibold text-sm text-stone-700">{category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{catItems.length} items</span>
                  {activeCategory === category
                    ? <ChevronUp className="w-4 h-4 text-stone-400" />
                    : <ChevronDown className="w-4 h-4 text-stone-400" />}
                </div>
              </button>

              {(activeCategory === null || activeCategory === category) && (
                <div className="px-3 pb-3 space-y-2">
                  {catItems
                    .sort((a, b) => {
                      const order = { red: 0, yellow: 1, grey: 2 }
                      return order[a.weather_highlight] - order[b.weather_highlight]
                    })
                    .map(item => (
                      <ClaimRow
                        key={item.id}
                        item={item}
                        claims={claimsByItem[item.id] ?? []}
                        currentUserId={currentUserId}
                        tripId={tripId}
                        onClaimsChange={handleClaimsChange}
                      />
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

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
              onFocus={e => e.target.style.boxShadow = '0 0 0 2px #2d5a2740'}
              onBlur={e => e.target.style.boxShadow = ''}
            />
            <div className="flex gap-2">
              <select
                value={newItemCategory}
                onChange={e => setNewItemCategory(e.target.value)}
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-1 border border-stone-200 rounded-xl overflow-hidden">
                <button onClick={() => setNewItemQty(q => Math.max(1, q - 1))} className="px-3 py-2 text-stone-500 hover:bg-stone-50">−</button>
                <span className="px-2 text-sm font-medium">{newItemQty}</span>
                <button onClick={() => setNewItemQty(q => q + 1)} className="px-3 py-2 text-stone-500 hover:bg-stone-50">+</button>
              </div>
            </div>
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
