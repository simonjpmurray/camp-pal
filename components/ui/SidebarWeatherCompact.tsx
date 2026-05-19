'use client'

import { useEffect, useState } from 'react'
import type { Forecast } from '@/lib/weather'
import { format } from 'date-fns'
import { CloudRain, Sun, Cloud, CloudSnow } from 'lucide-react'

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code >= 70 && code <= 79) return <CloudSnow className={className} />
  if (code >= 50 || (code >= 80 && code <= 82)) return <CloudRain className={className} />
  if (code <= 3) return code === 0 ? <Sun className={className} /> : <Cloud className={className} />
  return <Cloud className={className} />
}

export default function SidebarWeatherCompact({ tripId }: { tripId: string }) {
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/trips/${tripId}/weather`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setForecast(d); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false) } })
    return () => { cancelled = true }
  }, [tripId])

  return (
    <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--forest-pale)' }}>
      <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--forest)' }}>Forecast</div>
      {loading && <div className="text-xs animate-pulse" style={{ color: 'var(--muted)' }}>Loading…</div>}
      {error && <div className="text-xs" style={{ color: 'var(--muted)' }}>Forecast unavailable</div>}
      {!loading && !error && forecast?.days?.length ? (
        <div className="space-y-1.5">
          {forecast.days.slice(0, 4).map(day => (
            <div key={day.date} className="flex items-center justify-between text-xs">
              <span className="font-medium">{format(new Date(day.date + 'T12:00:00'), 'EEE')}</span>
              <div className="flex items-center gap-2">
                <WeatherIcon code={day.weatherCode} className="w-3.5 h-3.5" />
                <span className="font-semibold tabular-nums">{Math.round(day.tempMax)}°</span>
                <span className="tabular-nums opacity-60">{Math.round(day.tempMin)}°</span>
                {day.precipitationProbabilityMax > 30 && (
                  <span className="text-blue-600 font-medium tabular-nums">{Math.round(day.precipitationProbabilityMax)}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
