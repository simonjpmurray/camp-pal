'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PackingItem, ItemType, ScaledMultiplier } from '@/types/database'
import { CATEGORIES, scaleQuantity } from '@/lib/packing'
import { Plus, RefreshCw, ChevronDown, Check, Users, User as UserIcon, BarChart3, MessageCircle, Pencil, Tent, Moon, Shirt, CookingPot, Sandwich, Compass, Droplets, Armchair, Backpack, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { WeatherHighlight } from '@/types/database'

// Cartoon-style line icon shown beside each category heading.
const CATEGORY_ICON: Record<string, LucideIcon> = {
  'Shelter': Tent,
  'Sleep': Moon,
  'Clothing': Shirt,
  'Kitchen': CookingPot,
  'Food': Sandwich,
  'Safety & Navigation': Compass,
  'Hygiene': Droplets,
  'Camp Comfort': Armchair,
  'Extras': Backpack,
}

function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICON[category] ?? Package
}
import { Avatar } from '@/components/trips/MemberList'

interface Claim {
  id: string
  item_id: string
  trip_id: string
  user_id: string
  quantity_claimed: number
  confirmed: boolean
  note: string | null
  created_at: string
  users: { id: string; name: string; avatar_url: string | null } | null
}

const NOTE_MAX = 280

// Optional note / gear-suggestion textarea, shared by the group & personal
// claim editors. The parent owns the value; we cap length here as the app-layer
// guard (the DB also has a 280-char CHECK as defense-in-depth).
function NoteTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-stone-500 mb-1">
        Add a note or suggest alternative gear (optional)
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value.slice(0, NOTE_MAX))}
        rows={2}
        placeholder="e.g. I have a 4-person tent I can bring instead"
        className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none bg-white resize-none"
        onFocus={e => e.target.style.boxShadow = '0 0 0 2px #c0532a40'}
        onBlur={e => e.target.style.boxShadow = ''}
      />
      <div className="text-[10px] text-stone-400 text-right">{value.length}/{NOTE_MAX}</div>
    </div>
  )
}

// Renders the claimers' note indicators and an inline reveal of the selected
// note, attributed to the claimer. `note` text is rendered as a React child,
// so any HTML/script in it is escaped — no XSS surface. `currentUserId` enables
// the "Edit note" affordance on the viewer's own claim.
function ClaimNotes({
  claims,
  currentUserId,
  onEditOwnNote,
}: {
  claims: Claim[]
  currentUserId: string
  onEditOwnNote?: () => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const noted = claims.filter(c => c.note && c.note.trim() && c.users)
  if (noted.length === 0) return null
  const open = noted.find(c => c.id === openId)
  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        {noted.map(c => (
          <button
            key={c.id}
            onClick={() => setOpenId(openId === c.id ? null : c.id)}
            title={`Note from ${c.users!.name}`}
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
              openId === c.id
                ? 'border-stone-300 bg-stone-100 text-stone-700'
                : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
            }`}
          >
            <MessageCircle className="w-3 h-3" />
            {c.users!.name.split(' ')[0]}
          </button>
        ))}
      </div>
      {open && (
        <div className="mt-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
          <p className="text-xs font-medium text-stone-600">{open.users!.name}</p>
          <p className="text-sm text-stone-700 mt-0.5 whitespace-pre-wrap break-words">{open.note}</p>
          {open.user_id === currentUserId && onEditOwnNote && (
            <button
              onClick={onEditOwnNote}
              className="mt-1.5 text-xs text-stone-400 underline hover:text-stone-600"
            >
              Edit note
            </button>
          )}
        </div>
      )}
    </div>
  )
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

// Priority → row tint + left-accent colour (Field Edition).
const HIGHLIGHT_COLORS: Record<WeatherHighlight, { bg: string; accent: string }> = {
  red: { bg: 'var(--tint-essential)', accent: 'var(--signal-red)' },
  yellow: { bg: 'var(--tint-recommended)', accent: 'var(--ochre)' },
  grey: { bg: 'var(--canvas-raised)', accent: 'transparent' },
}

// Rubber-stamp priority tag styling. Essential = white on signal-red (rotated);
// Recommended = ochre text + border; Optional = muted, faint border, no rotation.
const STAMP_STYLE: Record<WeatherHighlight, { style: React.CSSProperties; rotate: boolean }> = {
  red: { style: { background: 'var(--signal-red)', color: '#fff' }, rotate: true },
  yellow: { style: { color: 'var(--ochre)', border: '1.5px solid var(--ochre)' }, rotate: true },
  grey: { style: { color: 'var(--muted-text)', border: '1px solid var(--hairline-strong)' }, rotate: false },
}

// Type tags: Group = white on Pine; Individual = ink text+border; Scaled = dusk-blue.
const TYPE_META: Record<ItemType, { label: string; icon: typeof Users; style: React.CSSProperties }> = {
  group: { label: 'Group', icon: Users, style: { background: 'var(--pine)', color: '#efe8d8' } },
  personal: { label: 'Individual', icon: UserIcon, style: { color: 'var(--ink)', border: '1.5px solid var(--ink)' } },
  scaled: { label: 'Scaled', icon: BarChart3, style: { color: 'var(--dusk-blue)', border: '1.5px solid var(--dusk-blue)' } },
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

// The effective priority drives the badge label, sort order and row colour.
// A per-trip owner override (Module 3) takes precedence over the weather-derived
// default; when no override is set we fall back to weather_highlight.
function effectiveHighlight(item: PackingItem): WeatherHighlight {
  return item.priority_override ?? item.weather_highlight
}

function highlightLabel(level: PackingItem['weather_highlight']) {
  return level === 'red' ? 'Essential' : level === 'yellow' ? 'Recommended' : 'Optional'
}

const PRIORITY_OPTIONS: { level: WeatherHighlight; label: string }[] = [
  { level: 'red', label: 'Essential' },
  { level: 'yellow', label: 'Recommended' },
  { level: 'grey', label: 'Optional' },
]

// The priority badge. Read-only for members; for the trip owner it becomes an
// inline picker. A pencil marks items whose priority was customised from the
// default. The actual write is owner-gated server-side via the
// set_item_priority_override RPC (see onChange handlers in the rows).
function PriorityBadge({
  item,
  isCreator,
  onChange,
}: {
  item: PackingItem
  isCreator: boolean
  onChange: (level: WeatherHighlight | null) => void
}) {
  const [open, setOpen] = useState(false)
  const effective = effectiveHighlight(item)
  const stamp = STAMP_STYLE[effective]
  const overridden = item.priority_override != null

  const stampInner = (
    <span
      className="stamp inline-flex items-center gap-1"
      style={{ ...stamp.style, transform: stamp.rotate ? 'rotate(-2deg)' : 'none' }}
    >
      {highlightLabel(effective)}
      {overridden && <Pencil className="w-2.5 h-2.5 opacity-70" />}
    </span>
  )

  if (!isCreator) return stampInner

  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        title={overridden ? 'Priority customised — click to change' : 'Click to change priority'}
        className="inline-flex items-center gap-1 cursor-pointer hover:opacity-80"
      >
        {stampInner}
        <ChevronDown className="w-2.5 h-2.5" style={{ color: 'var(--muted-text)' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 left-0 rounded-[3px] border py-1 min-w-[150px] shadow-lg"
            style={{ background: 'var(--canvas-raised)', borderColor: 'var(--hairline-strong)' }}>
            {PRIORITY_OPTIONS.map(opt => (
              <button
                key={opt.level}
                onClick={() => { onChange(opt.level); setOpen(false) }}
                className="w-full text-left text-xs px-3 py-1.5 flex items-center justify-between hover:opacity-80"
                style={{ color: 'var(--ink)', fontWeight: effective === opt.level ? 700 : 400 }}
              >
                {opt.label}
                {effective === opt.level && <Check className="w-3 h-3" style={{ color: 'var(--ember)' }} />}
              </button>
            ))}
            {overridden && (
              <button
                onClick={() => { onChange(null); setOpen(false) }}
                className="w-full text-left text-xs px-3 py-1.5 mt-1 border-t hover:opacity-80"
                style={{ color: 'var(--muted-text)', borderColor: 'var(--hairline)' }}
              >
                Reset to default
              </button>
            )}
          </div>
        </>
      )}
    </span>
  )
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
      className={`inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 font-mono-data uppercase tracking-wider text-[10px] font-bold ${
        isCreator ? 'cursor-pointer hover:opacity-80' : ''
      }`}
      style={meta.style}
    >
      <Icon className="w-3 h-3" />
      {meta.label}
    </Tag>
  )
}

// Kit-coverage meter: kicker label + big Newsreader fraction over a split bar.
function CoverageMeter({ label, covered, total, color }: { label: string; covered: number; total: number; color: string }) {
  const pct = total > 0 ? Math.max(0, Math.min(1, covered / total)) : 0
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="kicker truncate">{label}</span>
        <span className="font-display font-semibold text-2xl leading-none shrink-0" style={{ color: 'var(--ink)' }}>
          {covered}<span style={{ color: 'var(--muted-text)' }}>/{total}</span>
        </span>
      </div>
      <div className="flex h-2 rounded-[2px] overflow-hidden" style={{ background: 'rgba(28,26,23,0.13)' }}>
        <div style={{ flex: pct, background: color, transition: 'flex 0.2s ease' }} />
        <div style={{ flex: 1 - pct }} />
      </div>
    </div>
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
  const [note, setNote] = useState(myClaim?.note ?? '')
  const [editingItemQty, setEditingItemQty] = useState(false)
  const [itemQty, setItemQty] = useState(item.quantity)
  const [loading, setLoading] = useState(false)

  const isScaled = getItemType(item) === 'scaled'
  const suggestedQty = isScaled
    ? scaleQuantity(1, item.scaled_multiplier, memberCount, nightCount)
    : null

  // Populate the editor from the current claim before opening it.
  function startEdit() {
    setQty(myClaim?.quantity_claimed ?? 1)
    setNote(myClaim?.note ?? '')
    setEditing(true)
  }

  async function claimItem() {
    setLoading(true)
    const { data } = await supabase
      .from('item_claims')
      .insert({ item_id: item.id, trip_id: tripId, user_id: currentUserId, quantity_claimed: qty, confirmed: true, note: note.trim() || null })
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
      .update({ quantity_claimed: qty, note: note.trim() || null })
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

  const colors = HIGHLIGHT_COLORS[effectiveHighlight(item)]

  return (
    <div className="rounded-[3px] p-3.5 transition-all"
      style={{
        background: colors.bg,
        border: '1px solid var(--hairline)',
        borderLeft: `3px solid ${colors.accent === 'transparent' ? 'var(--hairline)' : colors.accent}`,
      }}>
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
          style={isCovered
            ? { borderColor: 'var(--confirm-green)', background: 'var(--confirm-green)' }
            : { borderColor: 'var(--hairline-strong)' }}>
          {isCovered && <Check className="w-3 h-3 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{item.name}</span>
            {item.quantity > 1 && !editingItemQty && (
              <span className="font-mono-data text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-text)' }}>×{item.quantity} needed</span>
            )}
            <PriorityBadge
              item={item}
              isCreator={isCreator}
              onChange={async (level) => {
                const prev = item.priority_override
                onItemUpdate({ ...item, priority_override: level })
                const { error } = await supabase.rpc('set_item_priority_override', { p_item_id: item.id, p_priority: level })
                if (error) onItemUpdate({ ...item, priority_override: prev })
              }}
            />
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
            <p className="text-xs mt-1" style={{ color: 'var(--ochre)' }}>
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
                <div key={c.id} className="flex items-center gap-1 text-xs rounded-[3px] px-2 py-0.5"
                  style={{ background: 'var(--canvas-raised)', border: '1px solid var(--hairline)' }}>
                  <Avatar user={c.users} size="sm" />
                  <span style={{ color: 'var(--ink)' }}>{c.users.name.split(' ')[0]}</span>
                  {c.quantity_claimed > 1 && <span style={{ color: 'var(--muted-text)' }}>×{c.quantity_claimed}</span>}
                </div>
              ))}
              <span className="font-mono-data text-[10px] uppercase tracking-wider"
                style={{ color: isCovered ? 'var(--confirm-green)' : (item.quantity > 1 ? 'var(--signal-red)' : 'var(--muted-text)') }}>
                {totalClaimed}/{item.quantity} claimed{item.quantity > 1 && totalClaimed < item.quantity ? ` · ${item.quantity - totalClaimed} left` : ''}
              </span>
            </div>
          )}

          {/* Claim notes / gear suggestions */}
          <ClaimNotes claims={claims} currentUserId={currentUserId} onEditOwnNote={startEdit} />
        </div>

        {/* My claim controls — right-hand column (compact) */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          {!myClaim && !editing && (
            <button
              onClick={() => startEdit()}
              className="text-xs font-semibold px-2.5 py-1 rounded-[3px] transition-opacity whitespace-nowrap text-white hover:opacity-90"
              style={{ background: 'var(--ember)' }}
            >
              + I&apos;ll bring this
            </button>
          )}

          {!editing && myClaim && (
            <>
              <span className="text-xs text-stone-500 whitespace-nowrap">
                You: ×{myClaim.quantity_claimed}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={startEdit}
                  className="text-xs text-stone-400 underline hover:text-stone-600">
                  Edit
                </button>
                {!myClaim.note && (
                  <button onClick={startEdit}
                    className="text-xs text-stone-400 underline hover:text-stone-600">
                    Add note
                  </button>
                )}
                <button onClick={unclaim} className="text-xs text-red-400 underline hover:text-red-600">
                  Unclaim
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full-width editor (drops below the row when editing) */}
      {editing && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
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
          </div>
          <NoteTextarea value={note} onChange={setNote} />
        </div>
      )}
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
  const [editingNote, setEditingNote] = useState(false)
  const [note, setNote] = useState(myClaim?.note ?? '')

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

  function startEditNote() {
    setNote(myClaim?.note ?? '')
    setEditingNote(true)
  }

  async function saveNote() {
    if (!myClaim) return
    setLoading(true)
    const { data } = await supabase
      .from('item_claims')
      .update({ note: note.trim() || null })
      .eq('id', myClaim.id)
      .select('*, users(id, name, avatar_url)')
      .single()
    if (data) onClaimsChange(item.id, claims.map(c => c.id === myClaim.id ? data as Claim : c))
    setEditingNote(false)
    setLoading(false)
  }

  const colors = HIGHLIGHT_COLORS[effectiveHighlight(item)]

  return (
    <div className="rounded-[3px] p-3.5 transition-all"
      style={{
        background: colors.bg,
        border: '1px solid var(--hairline)',
        borderLeft: `3px solid ${colors.accent === 'transparent' ? 'var(--hairline)' : colors.accent}`,
      }}>
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
          style={allConfirmed
            ? { borderColor: 'var(--confirm-green)', background: 'var(--confirm-green)' }
            : { borderColor: 'var(--hairline-strong)' }}>
          {allConfirmed && <Check className="w-3 h-3 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{item.name}</span>
            <PriorityBadge
              item={item}
              isCreator={isCreator}
              onChange={async (level) => {
                const prev = item.priority_override
                onItemUpdate({ ...item, priority_override: level })
                const { error } = await supabase.rpc('set_item_priority_override', { p_item_id: item.id, p_priority: level })
                if (error) onItemUpdate({ ...item, priority_override: prev })
              }}
            />
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
                  style={isMe ? { boxShadow: confirmed ? 'inset 0 0 0 2px var(--confirm-green)' : 'inset 0 0 0 2px var(--hairline-strong)' } : {}}
                >
                  <div className={`rounded-full ${confirmed ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                    <Avatar user={member} size="sm" />
                  </div>
                  {confirmed && (
                    <span className="absolute -bottom-0.5 -right-0.5 rounded-full w-3 h-3 flex items-center justify-center border border-white"
                      style={{ background: 'var(--confirm-green)' }}>
                      <Check className="w-2 h-2 text-white" strokeWidth={3} />
                    </span>
                  )}
                </div>
              )
            })}
            <span className="font-mono-data text-[10px] uppercase tracking-wider ml-1"
              style={{ color: allConfirmed ? 'var(--confirm-green)' : 'var(--muted-text)' }}>
              {confirmedCount}/{memberCount} confirmed
            </span>
          </div>

          {/* Claim notes / gear suggestions */}
          <ClaimNotes claims={claims} currentUserId={currentUserId} onEditOwnNote={startEditNote} />
        </div>

        {/* My confirm/unconfirm — right-hand column (compact) */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          {!myClaim ? (
            <button
              onClick={confirmMine}
              disabled={loading}
              className="text-xs font-semibold px-2.5 py-1 rounded-[3px] transition-opacity disabled:opacity-60 whitespace-nowrap text-white hover:opacity-90"
              style={{ background: 'var(--dusk-blue)' }}
            >
              {loading ? '…' : '✓ Mark packed'}
            </button>
          ) : !editingNote ? (
            <>
              <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--confirm-green)' }}>✓ You&apos;re bringing this</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={startEditNote}
                  className="text-xs text-stone-400 underline hover:text-stone-600"
                >
                  {myClaim.note ? 'Edit note' : 'Add note'}
                </button>
                <button
                  onClick={unconfirmMine}
                  disabled={loading}
                  className="text-xs text-red-400 underline hover:text-red-600"
                >
                  Unmark
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Full-width note editor (drops below the row when editing) */}
      {myClaim && editingNote && (
        <div className="mt-3 space-y-2">
          <NoteTextarea value={note} onChange={setNote} />
          <div className="flex items-center gap-2">
            <button
              onClick={saveNote}
              disabled={loading}
              className="text-xs font-medium px-2.5 py-1 rounded-lg text-white transition-opacity disabled:opacity-60"
              style={{ background: 'var(--forest)' }}
            >
              {loading ? '…' : 'Save note'}
            </button>
            <button onClick={() => setEditingNote(false)} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
          </div>
        </div>
      )}
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
  const [regenerating, setRegenerating] = useState(false)
  // Add-custom-item state. `addingSection` holds the sectionKey (`<prefix>:<category>`)
  // of the one section whose inline add form is currently open, or null when closed.
  // The category is implied by the section, so there is no category picker.
  const [addingSection, setAddingSection] = useState<string | null>(null)
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

  // Open the inline add form for a specific category section, pre-filling the
  // (implied) category and defaulting the item type to match the active tab.
  function openAddForSection(sectionKey: string, category: string, keyPrefix: string) {
    setNewItemName('')
    setNewItemCategory(category)
    setNewItemQty(1)
    setNewItemType(keyPrefix === 'personal' ? 'personal' : 'group')
    setNewItemMultiplier('per_person')
    setAddingSection(sectionKey)
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
      setAddingSection(null)
    }
  }

  // Subtle "+ Add item" affordance rendered at the top of each category section.
  // Collapsed: a dashed muted row. Expanded (when this section is the active one):
  // the inline add form, with the category implied by the section.
  function renderAddRow(sectionKey: string, category: string, keyPrefix: string) {
    if (addingSection !== sectionKey) {
      return (
        <button
          onClick={() => openAddForSection(sectionKey, category, keyPrefix)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg border border-dashed border-stone-300 text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add New Custom Item
        </button>
      )
    }
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 space-y-3">
        <input
          autoFocus
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addCustomItem(); if (e.key === 'Escape') setAddingSection(null) }}
          placeholder={`Add to ${category}…`}
          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
          onFocus={e => e.target.style.boxShadow = '0 0 0 2px #c0532a40'}
          onBlur={e => e.target.style.boxShadow = ''}
        />
        <div className="flex gap-2 flex-wrap">
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
            <div className="flex items-center gap-1 border border-stone-200 rounded-xl overflow-hidden bg-white">
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
            disabled={!newItemName.trim()}
            className="flex-1 text-sm font-medium py-2 rounded-xl text-white disabled:opacity-50"
            style={{ background: 'var(--forest)' }}
          >
            Add item
          </button>
          <button
            onClick={() => setAddingSection(null)}
            className="px-4 text-sm text-stone-500 hover:text-stone-700"
          >
            Cancel
          </button>
        </div>
      </div>
    )
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
        <div className="rounded-[4px] border p-6 text-center text-sm"
          style={{ background: 'var(--canvas-raised)', borderColor: 'var(--hairline)', color: 'var(--muted-text)' }}>
          No items match the current filter.
        </div>
      )
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
        {keys.map((category, idx) => {
          const catItems = cats[category] ?? []
          const sectionKey = `${keyPrefix}:${category}`
          const Icon = categoryIcon(category)
          return (
            <div key={sectionKey} className="rounded-[4px] border overflow-hidden"
              style={{ background: 'var(--canvas-raised)', borderColor: 'var(--hairline)' }}>
              <div className="w-full flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <span className="flex items-center gap-2 min-w-0">
                  <span className="font-mono-data text-[11px] font-bold" style={{ color: 'var(--ember)' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-text)' }} />
                  <span className="font-display text-base font-semibold truncate" style={{ color: 'var(--ink)' }}>{category}</span>
                </span>
                <span className="font-mono-data text-[10px] uppercase tracking-wider shrink-0" style={{ color: 'var(--muted-text)' }}>{catItems.length}</span>
              </div>
              <div className="px-3 py-3 space-y-2">
                {renderAddRow(sectionKey, category, keyPrefix)}
                {/* Fixed-height list so every section is the same size; scrolls when items overflow. */}
                <div className="h-72 overflow-y-auto space-y-2 pr-1">
                  {catItems
                    .slice()
                    .sort((a, b) => {
                      const order = { red: 0, yellow: 1, grey: 2 }
                      return order[effectiveHighlight(a)] - order[effectiveHighlight(b)]
                    })
                    .map(renderItem)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      {/* Dual coverage meters */}
      <div className="rounded-[4px] border p-4 mb-4"
        style={{ background: 'var(--canvas-raised)', borderColor: 'var(--hairline)' }}>
        <div className="flex items-start gap-6">
          <CoverageMeter label="Group kit covered" covered={groupCovered} total={groupTotal} color="var(--ember)" />
          <CoverageMeter label="Your individual kit" covered={personalConfirmedByMe} total={personalTotal} color="var(--dusk-blue)" />
          {isCreator && (
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[3px] border transition-colors disabled:opacity-50 shrink-0 self-center"
              style={{ borderColor: 'var(--hairline-strong)', color: 'var(--ink)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          )}
        </div>
        <div className="kicker mt-3">
          {memberCount} {memberCount === 1 ? 'person' : 'crew'} · {nightCount} {nightCount === 1 ? 'night' : 'nights'}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(['all', 'unclaimed', 'mine', 'covered'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="font-mono-data text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-[3px] whitespace-nowrap transition-all border"
            style={filter === f
              ? { background: 'var(--ink)', color: 'var(--canvas)', borderColor: 'var(--ink)' }
              : { background: 'var(--canvas-raised)', color: 'var(--muted-text)', borderColor: 'var(--hairline)' }}
          >
            {f === 'all' ? 'All' : f === 'unclaimed' ? 'Unclaimed' : f === 'mine' ? 'Mine' : 'Covered'}
          </button>
        ))}
      </div>

      {/* Kit tabs */}
      <div className="flex gap-2 mb-4 border-b" style={{ borderColor: 'var(--hairline)' }}>
        <button
          onClick={() => setActiveTab('group')}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 -mb-px transition-colors"
          style={activeTab === 'group'
            ? { borderBottom: '2.5px solid var(--ember)', color: 'var(--ink)' }
            : { borderBottom: '2.5px solid transparent', color: 'var(--muted-text)' }}
        >
          <Users className="w-4 h-4" />
          Group kit
          <span className="font-mono-data text-[11px]" style={{ color: 'var(--muted-text)' }}>({groupTotal})</span>
        </button>
        <button
          onClick={() => setActiveTab('individual')}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 -mb-px transition-colors"
          style={activeTab === 'individual'
            ? { borderBottom: '2.5px solid var(--ember)', color: 'var(--ink)' }
            : { borderBottom: '2.5px solid transparent', color: 'var(--muted-text)' }}
        >
          <UserIcon className="w-4 h-4" />
          Individual kit
          <span className="font-mono-data text-[11px]" style={{ color: 'var(--muted-text)' }}>({personalTotal})</span>
        </button>
      </div>

      {activeTab === 'group' && (
        <div className="mb-6">
          <div className="kicker mb-2 px-1">Shared equipment &amp; supplies</div>
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
          <div className="kicker mb-2 px-1">Each member brings their own</div>
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
    </div>
  )
}
