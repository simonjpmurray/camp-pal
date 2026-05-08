# TASKS.md — Camp Trip Planner App

## Overview

A cross-platform camping trip coordination app that lets groups plan trips together,
claim packing items, chat, and get weather-smart gear suggestions. Works on
Chromebook, Android, and iPhone via a responsive web app (PWA).

---

## Tech Stack

- **Frontend**: React + Tailwind CSS (PWA, mobile-first responsive)
- **Backend**: Node.js + Express (or Next.js full-stack)
- **Database**: Supabase (Postgres + Realtime + Auth)
- **Weather API**: Open-Meteo (free, no key required) or OpenWeatherMap
- **Maps**: Google Maps API or Mapbox (trip location picker)
- **Push Notifications**: Web Push API (via service worker)
- **Hosting**: Vercel or Netlify

---

## Core Features

### 1. Authentication & User Profiles
- [ ] Sign up / log in with email or Google OAuth
- [ ] User profile: name, avatar/emoji, optional phone number
- [ ] Persistent sessions across devices

### 2. Trip Management
- [ ] Create a new trip with:
  - Trip name
  - Location (search + map pin via geocoding)
  - Start date & end date
  - Optional description / notes
- [ ] View all trips (upcoming + past)
- [ ] Edit or delete a trip (creator only)
- [ ] Trip detail page showing all info, members, and packing list

### 3. Invite & Join System
- [ ] Generate a unique shareable invite link (e.g. `/join/abc123`)
- [ ] Invite via email (send link by email)
- [ ] Join trip via invite code or link
- [ ] Trip member list with roles: Creator, Member
- [ ] Creator can remove members

### 4. Weather-Smart Packing List
- [ ] On trip creation (or update), fetch forecast from weather API using:
  - Trip location (lat/lng)
  - Trip dates
- [ ] Parse forecast: temperature range, precipitation chance, wind, conditions
- [ ] Generate a comprehensive categorised packing list:
  - **Shelter**: tent, tarp, stakes, mallet, guy lines, footprint
  - **Sleep**: sleeping bag, sleeping pad, pillow, eye mask, earplugs
  - **Clothing**: base layers, insulating layers, rain jacket, warm hat, gloves, hiking boots, camp shoes, socks, underwear, sun hat
  - **Kitchen**: stove, fuel, lighter/matches, cookpot, pan, utensils, plates/bowls, mugs, camp knife, cutting board, washing basin, dish soap, food storage bags, bear canister (if required), cooler, water bottles, water filter/purifier
  - **Food**: breakfast items, lunch items, dinner items, snacks, coffee/tea, cooking oil, spices, condiments
  - **Safety & Navigation**: first aid kit, map, compass, GPS device, whistle, emergency blanket, headlamp + batteries, backup lighter, repair kit, multi-tool
  - **Hygiene**: toothbrush/paste, biodegradable soap, hand sanitiser, toilet paper, trowel, menstrual products, sunscreen, insect repellent, lip balm
  - **Camp Comfort**: camp chairs, camp table, lantern, firewood/firestarter, axe/hatchet, tarp/shade shelter, hammock
  - **Extras**: camera, binoculars, field guides, books/games, power bank, solar charger, phone mount, dog supplies (if applicable)
- [ ] **Weather-based highlighting rules**:
  - 🟥 **Red / Must-Bring**: Items critical given forecast (e.g. rain jacket if >40% rain chance; thermal layers if <5°C nights; sunscreen if >28°C and sunny)
  - 🟨 **Yellow / Recommended**: Items useful but not critical (e.g. warm hat if 5–15°C; insect repellent if summer/humid)
  - ⬜ **Grey / Optional**: Items that aren't weather-relevant for this trip
  - Add a brief tooltip/label explaining WHY an item is highlighted (e.g. "Rain expected Friday–Saturday")
- [ ] Allow trip creator to add custom items to the list
- [ ] Allow members to suggest items (pending creator approval, or open)

### 5. Item Claiming ("Who's Bringing What")
- [ ] **Multiple people can claim the same item** — claims are per-user, not exclusive
- [ ] Each member adds their own claim to an item independently (e.g. both Sarah and Tom can claim "Camp chairs")
- [ ] Items have a total quantity (e.g. "Camp chairs x4") and each claimer specifies how many they're bringing
- [ ] Running tally shows claimed vs. needed (e.g. "3 of 4 claimed — Sarah ×2, Tom ×1")
- [ ] Item is marked fully covered ✅ when claimed quantity meets or exceeds total quantity
- [ ] Item stays visible and claimable even after fully covered (in case of over-provisioning or changes)
- [ ] Claim states per user: Not claimed → Claiming (set quantity) → Confirmed
- [ ] Members can unclaim or adjust their own quantity at any time
- [ ] Visual indicator showing all claimers for each item (stacked avatars + names + quantities)
- [ ] Filter list by: All / Unclaimed / My Items / By Category / Fully Covered
- [ ] "Coverage summary" at top: e.g. "42 of 67 items fully covered ✅"

### 6. Trip Chat
- [ ] Realtime group chat per trip (via Supabase Realtime or WebSockets)
- [ ] Messages show sender name, avatar, timestamp
- [ ] Support text messages and emoji reactions
- [ ] Pinned messages (creator can pin important info)
- [ ] Unread message badge on trip card

### 7. Trip Details & Map
- [ ] Map view of trip location (embedded map)
- [ ] Display: campsite name, address, coordinates
- [ ] "Get Directions" button (opens Google Maps / Apple Maps)
- [ ] Trip dates with countdown: "Trip starts in 12 days"
- [ ] Weather forecast widget on trip page (7-day or date-range view)
- [ ] Attach links (e.g. campsite booking confirmation URL)

### 8. Push Notifications
- [ ] Request notification permission on first trip join
- [ ] Notify members when:
  - Someone joins the trip
  - An item they haven't claimed is still unclaimed 2 days before trip
  - A new chat message is posted
  - Trip details are updated
  - Weather forecast changes significantly (re-check 7 days before trip)
- [ ] User can manage notification preferences per trip

---

## UI / UX Requirements

- **Mobile-first** responsive design — optimised for phone screens, works on tablet and desktop
- **PWA**: installable on Android (Add to Home Screen) and iOS (Safari share → Add to Home Screen); works on Chromebook via Chrome
- **Offline support**: basic offline view of trip details and packing list (service worker caching)
- **Design aesthetic**: outdoorsy but modern — think earthy tones (forest green, warm tan, slate), strong typography, nature-inspired but clean. NOT generic. Use a distinctive display font for headings.
- **Dark mode** support
- Smooth transitions and micro-interactions (item claim animation, chat message slide-in)
- Accessible: WCAG AA contrast, keyboard navigable, screen reader labels

---

## Data Models (Supabase / Postgres)

```
users: id, email, name, avatar_url, created_at
trips: id, name, location_name, lat, lng, start_date, end_date, description, invite_code, creator_id, created_at
trip_members: id, trip_id, user_id, role (creator|member), joined_at
packing_items: id, trip_id, category, name, quantity, is_custom, weather_highlight (red|yellow|grey), highlight_reason, created_at
item_claims: id, item_id, trip_id, user_id, quantity_claimed, confirmed, created_at
messages: id, trip_id, user_id, content, pinned, created_at
notifications: id, user_id, trip_id, type, message, read, created_at
weather_cache: id, trip_id, fetched_at, forecast_json
```

---

## Pages / Routes

| Route | Description |
|---|---|
| `/` | Landing page / marketing |
| `/login` | Auth page |
| `/dashboard` | All trips overview |
| `/trips/new` | Create trip form |
| `/trips/[id]` | Trip detail (packing, chat, map tabs) |
| `/trips/[id]/packing` | Full packing list view |
| `/trips/[id]/chat` | Trip chat |
| `/trips/[id]/edit` | Edit trip (creator only) |
| `/join/[code]` | Join trip via invite link |
| `/profile` | User profile settings |

---

## Build Order (Recommended for Claude Code)

1. **Project scaffold** — Next.js + Tailwind + Supabase setup, auth, basic routing
2. **Trip CRUD** — create, list, view, edit trips with location picker
3. **Invite system** — generate codes, join via link or email
4. **Packing list engine** — static comprehensive list + weather API integration + highlight logic
5. **Item claiming** — claim/unclaim UI, realtime sync
6. **Trip chat** — realtime messaging with Supabase
7. **Map & weather widget** — embedded map, forecast display on trip page
8. **Push notifications** — service worker, notification triggers
9. **PWA setup** — manifest, service worker, offline caching
10. **Polish** — dark mode, animations, responsive QA on mobile/tablet/desktop

---

## Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=        # or Google Maps API key
OPENWEATHERMAP_API_KEY=          # if using OpenWeatherMap (Open-Meteo needs no key)
NEXT_PUBLIC_APP_URL=             # for invite links
VAPID_PUBLIC_KEY=                # for Web Push
VAPID_PRIVATE_KEY=
```

---

## Notes for Claude Code

- Use Supabase Row Level Security (RLS) — users should only see trips they are members of
- Weather fetching should be server-side (API route) and cached in `weather_cache` table — re-fetch if cache is >6 hours old
- Invite codes should be short, URL-safe, and unique (nanoid recommended)
- Packing list generation should be a pure function: `generatePackingList(forecast) → items[]` — easy to test and iterate
- Push notification service worker should be registered on app load, not gated behind login
- All realtime subscriptions (chat, item claims) should be scoped to the current trip ID
