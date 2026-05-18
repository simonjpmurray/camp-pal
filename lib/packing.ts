import type { Forecast } from './weather'
import type { WeatherHighlight, ItemType, ScaledMultiplier } from '@/types/database'

export interface PackingItemTemplate {
  category: string
  name: string
  quantity: number
  itemType: ItemType
  scaledMultiplier?: ScaledMultiplier
  highlight: (forecast: Forecast) => { level: WeatherHighlight; reason: string | null }
}

function highlight(level: WeatherHighlight, reason: string | null = null) {
  return { level, reason }
}

const ITEMS: PackingItemTemplate[] = [
  // SHELTER
  { category: 'Shelter', name: 'Tent', quantity: 1, itemType: 'personal', highlight: () => highlight('grey') },
  { category: 'Shelter', name: 'Tarp', quantity: 1, itemType: 'group', highlight: (f) => f.maxPrecipProbability > 40 ? highlight('red', 'Rain expected — tarp provides extra protection') : highlight('yellow') },
  { category: 'Shelter', name: 'Tent stakes', quantity: 8, itemType: 'personal', highlight: () => highlight('grey') },
  { category: 'Shelter', name: 'Mallet', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },
  { category: 'Shelter', name: 'Guy lines', quantity: 4, itemType: 'personal', highlight: (f) => f.maxWindspeed > 40 ? highlight('red', `High winds expected (${Math.round(f.maxWindspeed)} km/h)`) : highlight('grey') },
  { category: 'Shelter', name: 'Tent footprint', quantity: 1, itemType: 'personal', highlight: () => highlight('grey') },

  // SLEEP
  { category: 'Sleep', name: 'Sleeping bag', quantity: 1, itemType: 'personal', highlight: (f) => f.tempMinOverall < 5 ? highlight('red', `Cold nights expected (${Math.round(f.tempMinOverall)}°C)`) : f.tempMinOverall < 15 ? highlight('yellow', `Cool nights — use appropriate rating`) : highlight('grey') },
  { category: 'Sleep', name: 'Sleeping pad', quantity: 1, itemType: 'personal', highlight: (f) => f.tempMinOverall < 10 ? highlight('yellow', 'Insulation from cold ground') : highlight('grey') },
  { category: 'Sleep', name: 'Pillow', quantity: 1, itemType: 'personal', highlight: () => highlight('grey') },
  { category: 'Sleep', name: 'Eye mask', quantity: 1, itemType: 'personal', highlight: () => highlight('grey') },
  { category: 'Sleep', name: 'Earplugs', quantity: 1, itemType: 'personal', highlight: () => highlight('grey') },

  // CLOTHING
  { category: 'Clothing', name: 'Base layers (thermal)', quantity: 2, itemType: 'personal', highlight: (f) => f.tempMinOverall < 5 ? highlight('red', `Below-freezing nights — base layers essential`) : f.tempMinOverall < 12 ? highlight('yellow', `Cool nights expected`) : highlight('grey') },
  { category: 'Clothing', name: 'Insulating layer / fleece', quantity: 1, itemType: 'personal', highlight: (f) => f.tempMinOverall < 10 ? highlight('red', `Cold conditions expected`) : highlight('yellow') },
  { category: 'Clothing', name: 'Rain jacket', quantity: 1, itemType: 'personal', highlight: (f) => f.maxPrecipProbability > 40 ? highlight('red', `${Math.round(f.maxPrecipProbability)}% rain chance`) : f.maxPrecipProbability > 20 ? highlight('yellow', 'Some rain possible') : highlight('grey') },
  { category: 'Clothing', name: 'Warm hat / beanie', quantity: 1, itemType: 'personal', highlight: (f) => f.tempMinOverall < 8 ? highlight('red', 'Cold nights — hat essential') : f.tempMinOverall < 15 ? highlight('yellow') : highlight('grey') },
  { category: 'Clothing', name: 'Gloves', quantity: 1, itemType: 'personal', highlight: (f) => f.tempMinOverall < 5 ? highlight('red', 'Near-freezing temps') : f.tempMinOverall < 10 ? highlight('yellow') : highlight('grey') },
  { category: 'Clothing', name: 'Hiking boots', quantity: 1, itemType: 'personal', highlight: () => highlight('yellow') },
  { category: 'Clothing', name: 'Camp shoes / sandals', quantity: 1, itemType: 'personal', highlight: () => highlight('grey') },
  { category: 'Clothing', name: 'Socks (x5)', quantity: 5, itemType: 'personal', highlight: () => highlight('yellow') },
  { category: 'Clothing', name: 'Underwear (x5)', quantity: 5, itemType: 'personal', highlight: () => highlight('grey') },
  { category: 'Clothing', name: 'Sun hat / cap', quantity: 1, itemType: 'personal', highlight: (f) => f.tempMaxOverall > 25 ? highlight('red', `Hot days expected (${Math.round(f.tempMaxOverall)}°C)`) : highlight('grey') },
  { category: 'Clothing', name: 'T-shirts (x3)', quantity: 3, itemType: 'personal', highlight: () => highlight('grey') },
  { category: 'Clothing', name: 'Shorts / lightweight trousers', quantity: 2, itemType: 'personal', highlight: () => highlight('grey') },

  // KITCHEN
  { category: 'Kitchen', name: 'Camp stove', quantity: 1, itemType: 'group', highlight: () => highlight('yellow') },
  { category: 'Kitchen', name: 'Fuel canisters', quantity: 2, itemType: 'scaled', scaledMultiplier: 'per_night', highlight: () => highlight('yellow') },
  { category: 'Kitchen', name: 'Lighter / matches', quantity: 2, itemType: 'group', highlight: () => highlight('red', 'Fire-starting is safety-critical') },
  { category: 'Kitchen', name: 'Cook pot', quantity: 1, itemType: 'group', highlight: () => highlight('yellow') },
  { category: 'Kitchen', name: 'Frying pan', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },
  { category: 'Kitchen', name: 'Utensils set', quantity: 1, itemType: 'scaled', scaledMultiplier: 'per_person', highlight: () => highlight('grey') },
  { category: 'Kitchen', name: 'Plates / bowls', quantity: 1, itemType: 'scaled', scaledMultiplier: 'per_person', highlight: () => highlight('grey') },
  { category: 'Kitchen', name: 'Mugs', quantity: 1, itemType: 'scaled', scaledMultiplier: 'per_person', highlight: () => highlight('grey') },
  { category: 'Kitchen', name: 'Camp knife', quantity: 1, itemType: 'group', highlight: () => highlight('yellow') },
  { category: 'Kitchen', name: 'Cutting board', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },
  { category: 'Kitchen', name: 'Washing basin', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },
  { category: 'Kitchen', name: 'Biodegradable dish soap', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },
  { category: 'Kitchen', name: 'Food storage bags / containers', quantity: 4, itemType: 'group', highlight: () => highlight('grey') },
  { category: 'Kitchen', name: 'Bear canister', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },
  { category: 'Kitchen', name: 'Cooler / ice box', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },
  { category: 'Kitchen', name: 'Water bottles (x2)', quantity: 2, itemType: 'personal', highlight: () => highlight('red', 'Hydration is always critical') },
  { category: 'Kitchen', name: 'Water filter / purifier', quantity: 1, itemType: 'group', highlight: () => highlight('yellow') },

  // FOOD
  { category: 'Food', name: 'Breakfast supplies', quantity: 1, itemType: 'scaled', scaledMultiplier: 'per_person_per_night', highlight: () => highlight('red', 'Essential — plan all meals before leaving') },
  { category: 'Food', name: 'Lunch supplies', quantity: 1, itemType: 'scaled', scaledMultiplier: 'per_person_per_night', highlight: () => highlight('red') },
  { category: 'Food', name: 'Dinner supplies', quantity: 1, itemType: 'scaled', scaledMultiplier: 'per_person_per_night', highlight: () => highlight('red') },
  { category: 'Food', name: 'Snacks', quantity: 1, itemType: 'scaled', scaledMultiplier: 'per_person', highlight: () => highlight('yellow') },
  { category: 'Food', name: 'Coffee / tea', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },
  { category: 'Food', name: 'Cooking oil', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },
  { category: 'Food', name: 'Spices & condiments', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },

  // SAFETY
  { category: 'Safety & Navigation', name: 'First aid kit', quantity: 1, itemType: 'group', highlight: () => highlight('red', 'Always required') },
  { category: 'Safety & Navigation', name: 'Map & compass', quantity: 1, itemType: 'group', highlight: () => highlight('yellow') },
  { category: 'Safety & Navigation', name: 'Headlamp + spare batteries', quantity: 1, itemType: 'personal', highlight: () => highlight('red', 'Essential for camp at night') },
  { category: 'Safety & Navigation', name: 'Emergency blanket', quantity: 1, itemType: 'personal', highlight: () => highlight('yellow') },
  { category: 'Safety & Navigation', name: 'Whistle', quantity: 1, itemType: 'personal', highlight: () => highlight('yellow') },
  { category: 'Safety & Navigation', name: 'Backup lighter', quantity: 1, itemType: 'group', highlight: () => highlight('yellow') },
  { category: 'Safety & Navigation', name: 'Multi-tool', quantity: 1, itemType: 'group', highlight: () => highlight('yellow') },
  { category: 'Safety & Navigation', name: 'Repair kit (duct tape, patches)', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },

  // HYGIENE
  { category: 'Hygiene', name: 'Toothbrush & toothpaste', quantity: 1, itemType: 'personal', highlight: () => highlight('red') },
  { category: 'Hygiene', name: 'Biodegradable soap', quantity: 1, itemType: 'personal', highlight: () => highlight('yellow') },
  { category: 'Hygiene', name: 'Hand sanitiser', quantity: 1, itemType: 'group', highlight: () => highlight('red', 'Food prep hygiene essential') },
  { category: 'Hygiene', name: 'Toilet paper', quantity: 2, itemType: 'scaled', scaledMultiplier: 'per_person', highlight: () => highlight('red') },
  { category: 'Hygiene', name: 'Trowel (cat-hole digging)', quantity: 1, itemType: 'group', highlight: () => highlight('yellow') },
  { category: 'Hygiene', name: 'Sunscreen SPF 50+', quantity: 1, itemType: 'personal', highlight: (f) => f.tempMaxOverall > 22 ? highlight('red', `Sunny/warm conditions expected (${Math.round(f.tempMaxOverall)}°C)`) : highlight('yellow') },
  { category: 'Hygiene', name: 'Insect repellent', quantity: 1, itemType: 'personal', highlight: (f) => f.tempMaxOverall > 18 ? highlight('yellow', 'Warm weather — insects likely active') : highlight('grey') },
  { category: 'Hygiene', name: 'Lip balm with SPF', quantity: 1, itemType: 'personal', highlight: (f) => f.tempMaxOverall > 22 ? highlight('yellow') : highlight('grey') },
  { category: 'Hygiene', name: 'Towel (quick-dry)', quantity: 1, itemType: 'personal', highlight: () => highlight('grey') },

  // CAMP COMFORT
  { category: 'Camp Comfort', name: 'Camp chairs', quantity: 1, itemType: 'personal', highlight: () => highlight('grey') },
  { category: 'Camp Comfort', name: 'Camp table', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },
  { category: 'Camp Comfort', name: 'Lantern', quantity: 1, itemType: 'group', highlight: () => highlight('yellow') },
  { category: 'Camp Comfort', name: 'Firewood or firestarter', quantity: 1, itemType: 'scaled', scaledMultiplier: 'per_night', highlight: () => highlight('yellow') },
  { category: 'Camp Comfort', name: 'Axe / hatchet', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },
  { category: 'Camp Comfort', name: 'Shade shelter / extra tarp', quantity: 1, itemType: 'group', highlight: (f) => f.tempMaxOverall > 28 ? highlight('yellow', `Hot days expected — shade useful`) : highlight('grey') },
  { category: 'Camp Comfort', name: 'Hammock', quantity: 1, itemType: 'personal', highlight: () => highlight('grey') },

  // EXTRAS
  { category: 'Extras', name: 'Camera', quantity: 1, itemType: 'personal', highlight: () => highlight('grey') },
  { category: 'Extras', name: 'Binoculars', quantity: 1, itemType: 'personal', highlight: () => highlight('grey') },
  { category: 'Extras', name: 'Field guides / books', quantity: 1, itemType: 'group', highlight: () => highlight('grey') },
  { category: 'Extras', name: 'Power bank', quantity: 1, itemType: 'personal', highlight: () => highlight('yellow') },
  { category: 'Extras', name: 'Solar charger', quantity: 1, itemType: 'group', highlight: (f) => f.tempMaxOverall > 18 ? highlight('yellow') : highlight('grey') },
]

export interface GeneratedItem {
  category: string
  name: string
  quantity: number
  item_type: ItemType
  scaled_multiplier: ScaledMultiplier | null
  weather_highlight: WeatherHighlight
  highlight_reason: string | null
}

export function scaleQuantity(
  baseQty: number,
  multiplier: ScaledMultiplier | null | undefined,
  memberCount: number,
  nightCount: number
): number {
  if (!multiplier) return baseQty
  const m = Math.max(1, memberCount)
  const n = Math.max(1, nightCount)
  switch (multiplier) {
    case 'per_person': return baseQty * m
    case 'per_night': return baseQty * n
    case 'per_person_per_night': return baseQty * m * n
  }
}

export function generatePackingList(
  forecast: Forecast,
  memberCount = 1,
  nightCount = 1
): GeneratedItem[] {
  return ITEMS.map(item => {
    const { level, reason } = item.highlight(forecast)
    const quantity = item.itemType === 'scaled'
      ? scaleQuantity(item.quantity, item.scaledMultiplier, memberCount, nightCount)
      : item.quantity
    return {
      category: item.category,
      name: item.name,
      quantity,
      item_type: item.itemType,
      scaled_multiplier: item.scaledMultiplier ?? null,
      weather_highlight: level,
      highlight_reason: reason,
    }
  })
}

export const CATEGORIES = [
  'Shelter', 'Sleep', 'Clothing', 'Kitchen', 'Food',
  'Safety & Navigation', 'Hygiene', 'Camp Comfort', 'Extras',
]
