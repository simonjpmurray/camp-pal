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

export default function LocationPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const markerRef = useRef<unknown>(null)

  async function search(q: string) {
    if (q.length < 3) { setResults([]); return }
    setSearching(true)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data: NominatimResult[] = await res.json()
    setResults(data)
    setSearching(false)
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  function selectResult(r: NominatimResult) {
    const loc = { name: r.display_name.split(',').slice(0, 3).join(', '), lat: parseFloat(r.lat), lng: parseFloat(r.lon) }
    onChange(loc)
    setQuery(loc.name)
    setResults([])
    setShowMap(true)
  }

  useEffect(() => {
    if (!showMap || !mapRef.current || mapInstanceRef.current) return

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      const lat = value?.lat ?? 51.5
      const lng = value?.lng ?? -0.1

      const map = L.map(mapRef.current!).setView([lat, lng], 12)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:var(--forest);transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      })

      if (value) {
        markerRef.current = L.marker([value.lat, value.lng], { icon }).addTo(map)
      }

      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = e.latlng
        if (markerRef.current) {
          (markerRef.current as ReturnType<typeof L.marker>).setLatLng([lat, lng])
        } else {
          markerRef.current = L.marker([lat, lng], { icon }).addTo(map)
        }
        // Reverse geocode
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          .then(r => r.json())
          .then(d => {
            const name = d.display_name?.split(',').slice(0, 3).join(', ') ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
            onChange({ name, lat, lng })
            setQuery(name)
          })
      })

      mapInstanceRef.current = map
    }

    initMap()
  }, [showMap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker when value changes externally
  useEffect(() => {
    if (value && mapInstanceRef.current && markerRef.current) {
      (markerRef.current as { setLatLng: (ll: [number, number]) => void }).setLatLng([value.lat, value.lng])
      const map = mapInstanceRef.current as { setView: (ll: [number, number], zoom: number) => void }
      map.setView([value.lat, value.lng], 12)
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
          className="w-full border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-shadow"
          onFocus={e => e.target.style.boxShadow = '0 0 0 2px #2d5a2740'}
          onBlur={e => { e.target.style.boxShadow = ''; setTimeout(() => setResults([]), 200) }}
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
        <div ref={mapRef} className="w-full h-56 rounded-xl overflow-hidden border border-stone-200" />
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
