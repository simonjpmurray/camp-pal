'use client'

import { useEffect, useRef } from 'react'

interface Props {
  lat: number
  lng: number
  locationName: string
}

export default function TripMap({ lat, lng, locationName }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current) return
    let map: { remove(): void } | null = null
    let cancelled = false

    async function init() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapRef.current) return

      const instance = L.map(mapRef.current).setView([lat, lng], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(instance)

      const icon = L.divIcon({
        html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:var(--forest);transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3)"></div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      })

      L.marker([lat, lng], { icon })
        .addTo(instance)
        .bindPopup(locationName)
        .openPopup()

      map = instance
    }

    init()

    return () => {
      cancelled = true
      if (map) {
        map.remove()
        map = null
      }
    }
  }, [lat, lng, locationName])

  return <div ref={mapRef} className="w-full h-48 rounded-xl overflow-hidden" />
}
