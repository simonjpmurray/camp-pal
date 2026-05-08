'use client'

import { useEffect, useState } from 'react'
import type { Forecast } from '@/lib/weather'
import { format } from 'date-fns'
import { CloudRain, Sun, Cloud, CloudSnow, Wind, Droplets } from 'lucide-react'

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code >= 70 && code <= 79) return <CloudSnow className={className} />
  if (code >= 50 || (code >= 80 && code <= 82)) return <CloudRain className={className} />
  if (code <= 3) return code === 0 ? <Sun className={className} /> : <Cloud className={className} />
  return <Cloud className={className} />
}

export default function WeatherWidget({ tripId }: { tripId: string }) {
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/trips/${tripId}/weather`)
      .then(r => r.json())
      .then(d => { setForecast(d); setLoading(false) })
      .catch(() => { setError('Could not load forecast'); setLoading(false) })
  }, [tripId])

  if (loading) return <div className="text-sm text-stone-400 animate-pulse">Loading forecast…</div>
  if (error) return <div className="text-sm text-stone-400">{error}</div>
  if (!forecast || !forecast.days?.length) return <div className="text-sm text-stone-400">No forecast available</div>

  return (
    <div>
      {/* Summary */}
      <div className="flex gap-4 text-sm text-stone-600 mb-4">
        <span className="flex items-center gap-1">
          <Droplets className="w-3.5 h-3.5 text-blue-400" />
          Up to {Math.round(forecast.maxPrecipProbability)}% rain
        </span>
        <span className="flex items-center gap-1">
          <Wind className="w-3.5 h-3.5 text-stone-400" />
          Up to {Math.round(forecast.maxWindspeed)} km/h
        </span>
      </div>

      {/* Day-by-day */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {forecast.days.slice(0, 7).map(day => (
          <div key={day.date} className="flex flex-col items-center gap-1.5 min-w-[52px]">
            <span className="text-xs text-stone-400 font-medium">
              {format(new Date(day.date + 'T12:00:00'), 'EEE')}
            </span>
            <WeatherIcon code={day.weatherCode} className="w-5 h-5 text-stone-500" />
            <span className="text-xs font-semibold text-stone-800">{Math.round(day.tempMax)}°</span>
            <span className="text-xs text-stone-400">{Math.round(day.tempMin)}°</span>
            {day.precipitationProbabilityMax > 30 && (
              <span className="text-xs text-blue-500 font-medium">{Math.round(day.precipitationProbabilityMax)}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
