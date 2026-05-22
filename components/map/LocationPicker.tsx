'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Search, Loader2 } from 'lucide-react'

interface Location {
  name: string
  lat: number
  lng: number
}

interface Props {
  value: Location | null
  onChange: (loc: Location) => void
}

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

interface LeafletMap {
  setView(latlng: [number, number], zoom: number): LeafletMap
  remove(): void
  on(event: 'click', handler: (e: { latlng: { lat: number; lng: number } }) => void): void
}

interface LeafletMarker {
  setLatLng(latlng: [number, number]): void
  addTo(map: LeafletMap): LeafletMarker
}

function shortenName(displayName: string): string {
  return displayName.split(',').slice(0, 3).join(', ').trim()
}

export default function LocationPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { valueRef.current = value }, [value])

  async function search(q: string) {
    if (q.length < 3) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      if (!res.ok) { setResults([]); return }
      const data: NominatimResult[] = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  function selectResult(r: NominatimResult) {
    const loc = { name: shortenName(r.display_name), lat: parseFloat(r.lat), lng: parseFloat(r.lon) }
    onChange(loc)
    setQuery(loc.name)
    setResults([])
    setShowMap(true)
  }

  useEffect(() => {
    if (!showMap || !mapContainerRef.current || mapRef.current) return

    let cancelled = false
    let lastReverse = 0

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapContainerRef.current) return

      const initial = valueRef.current
      const lat = initial?.lat ?? 51.5
      const lng = initial?.lng ?? -0.1

      const map = L.map(mapContainerRef.current).setView([lat, lng], 12) as unknown as LeafletMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map as never)

      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:var(--forest);transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      })

      if (initial) {
        markerRef.current = L.marker([initial.lat, initial.lng], { icon }).addTo(map as never) as unknown as LeafletMarker
      }

      map.on('click', async (e) => {
        const { lat: clat, lng: clng } = e.latlng
        if (markerRef.current) {
          markerRef.current.setLatLng([clat, clng])
        } else {
          markerRef.current = L.marker([clat, clng], { icon }).addTo(map as never) as unknown as LeafletMarker
        }
        // Throttle reverse geocode to once per 500ms — Nominatim usage policy.
        const now = Date.now()
        if (now - lastReverse < 500) return
        lastReverse = now
        try {
          const res = await fetch(`/api/reverse-geocode?lat=${clat}&lng=${clng}`)
          if (!res.ok) {
            onChangeRef.current({ name: `${clat.toFixed(4)}, ${clng.toFixed(4)}`, lat: clat, lng: clng })
            setQuery(`${clat.toFixed(4)}, ${clng.toFixed(4)}`)
            return
          }
          const d = await res.json()
          const name = d?.display_name ? shortenName(d.display_name) : `${clat.toFixed(4)}, ${clng.toFixed(4)}`
          onChangeRef.current({ name, lat: clat, lng: clng })
          setQuery(name)
        } catch {
          onChangeRef.current({ name: `${clat.toFixed(4)}, ${clng.toFixed(4)}`, lat: clat, lng: clng })
        }
      })

      mapRef.current = map
    }

    initMap()
    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [showMap])

  useEffect(() => {
    if (value && mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng])
      mapRef.current.setView([value.lat, value.lng], 12)
    }
  }, [value])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search for a campsite or location…"
          className="w-full border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_#c0532a40]"
          onBlur={() => setTimeout(() => setResults([]), 200)}
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-stone-400" />}
      </div>

      {results.length > 0 && (
        <div className="border border-stone-200 rounded-xl overflow-hidden shadow-lg bg-white z-10 relative">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectResult(r)}
              className="w-full flex items-start gap-2 px-4 py-3 text-sm text-left hover:bg-stone-50 border-b border-stone-100 last:border-0 transition-colors"
            >
              <MapPin className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
              <span className="text-stone-700">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {value && (
        <div className="text-xs text-stone-500 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--forest)' }} />
          <span className="font-medium" style={{ color: 'var(--forest)' }}>{value.name}</span>
          <span className="text-stone-400">({value.lat.toFixed(4)}, {value.lng.toFixed(4)})</span>
        </div>
      )}

      {showMap && (
        <div ref={mapContainerRef} className="w-full h-56 rounded-xl overflow-hidden border border-stone-200" />
      )}

      {!showMap && value && (
        <button type="button" onClick={() => setShowMap(true)}
          className="text-xs font-medium underline" style={{ color: 'var(--forest)' }}>
          Show on map
        </button>
      )}
    </div>
  )
}
