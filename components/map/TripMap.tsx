'use client'

import { useEffect, useRef } from 'react'

interface Props {
  lat: number
  lng: number
  locationName: string
}

export default function TripMap({ lat, lng, locationName }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current || !mapRef.current) return
    initRef.current = true

    async function init() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      const map = L.map(mapRef.current!).setView([lat, lng], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      const icon = L.divIcon({
        html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:var(--forest);transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3)"></div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      })

      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(locationName)
        .openPopup()
    }

    init()
  }, [lat, lng, locationName])

  return <div ref={mapRef} className="w-full h-48 rounded-xl overflow-hidden" />
}
