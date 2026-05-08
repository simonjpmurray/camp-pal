export interface DayForecast {
  date: string
  tempMax: number
  tempMin: number
  precipitationSum: number
  precipitationProbabilityMax: number
  windspeedMax: number
  weatherCode: number
}

export interface Forecast {
  days: DayForecast[]
  tempMaxOverall: number
  tempMinOverall: number
  maxPrecipProbability: number
  totalPrecipitation: number
  maxWindspeed: number
}

// WMO weather code → description
function describeCode(code: number): string {
  if (code === 0) return 'Clear sky'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 49) return 'Fog'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code <= 86) return 'Snow showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Unknown'
}

export async function fetchWeather(lat: number, lng: number, startDate: string, endDate: string): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'windspeed_10m_max',
      'weathercode',
    ].join(','),
    timezone: 'auto',
    start_date: startDate,
    end_date: endDate,
    temperature_unit: 'celsius',
    windspeed_unit: 'kmh',
    precipitation_unit: 'mm',
  })

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error('Weather fetch failed')

  const json = await res.json()
  const d = json.daily

  const days: DayForecast[] = d.time.map((date: string, i: number) => ({
    date,
    tempMax: d.temperature_2m_max[i],
    tempMin: d.temperature_2m_min[i],
    precipitationSum: d.precipitation_sum[i] ?? 0,
    precipitationProbabilityMax: d.precipitation_probability_max[i] ?? 0,
    windspeedMax: d.windspeed_10m_max[i] ?? 0,
    weatherCode: d.weathercode[i],
  }))

  return {
    days,
    tempMaxOverall: Math.max(...days.map(d => d.tempMax)),
    tempMinOverall: Math.min(...days.map(d => d.tempMin)),
    maxPrecipProbability: Math.max(...days.map(d => d.precipitationProbabilityMax)),
    totalPrecipitation: days.reduce((s, d) => s + d.precipitationSum, 0),
    maxWindspeed: Math.max(...days.map(d => d.windspeedMax)),
  }
}

export { describeCode }
