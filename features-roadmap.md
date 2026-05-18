# Camping Trip Organiser — New Features Roadmap

Features ranked by user-reported importance, based on research across camping and group travel apps.

---

## 🥇 Priority 1 — Highest User Demand

### 1. Budget Tracking & Cost Splitting
The #1 pain point in group travel. Most groups currently juggle two separate apps (one for planning, one for money). Building this in natively is a major competitive advantage.

**Scope:**
- Log shared expenses per trip
- Track who paid for what
- Auto-calculate who owes whom
- Optional receipt photo attachment
- Settlement summary view (e.g. "Dave owes Sarah £12")

---

### 2. Offline Access
A must-have for the core camping use case — remote areas frequently have no signal. Apps without offline support receive consistently negative reviews from campers.

**Scope:**
- Download trip details for offline viewing
- Offline packing list access and item claiming
- Offline group chat message queue (syncs when back online)
- Cached weather data from last sync

---

## 🥈 Priority 2 — High Demand

### 3. Meal Planning & Grocery List Generator
A clear gap in the market — existing apps either skip this or gear it toward eating out rather than campsite cooking. Highly requested in user reviews.

**Scope:**
- Day-by-day meal planner (breakfast, lunch, dinner, snacks)
- Recipe suggestions suited to camping (fire, camping stove, no-cook)
- Auto-generate a consolidated grocery list from the meal plan
- Assign grocery shopping to group members
- Dietary restrictions/preferences per member

---

### 4. Reusable Trip Templates
One of the most common user complaints across competing apps — checklists reset between trips with no way to save your setup. A template system turns repeat campers into loyal users.

**Scope:**
- Save any trip as a reusable template
- Templates carry over packing list customisations, meal plans, and item categories
- Personal templates (private) and shared templates (community)
- "Duplicate trip" quick action

---

## 🥉 Priority 3 — Medium-High Demand

### 5. Group vs Personal Item Categories
A differentiated feature not well-executed by any current camping app. Distinguishes between items the whole group shares (one needed) vs items every individual needs their own of.

**Scope:**
- Each packing list item tagged as: `group` | `personal` | `scaled`
- **Group items** — one person claims it, it's covered for everyone (e.g. BBQ, first aid kit, axe)
- **Personal items** — each member has their own instance to confirm (e.g. sleeping bag, clothing)
- **Scaled items** — quantity auto-suggests based on group size and trip length (e.g. food, firewood)
- Users can override category per item
- Packing list UI split into "Group Kit" and "Personal Kit" sections
- Group Kit: shows claimed/unclaimed with who's bringing it
- Personal Kit: shows per-person progress (e.g. 4/6 confirmed)

---

### 6. Interactive Map with Points of Interest
Reduces the need to switch between apps while planning. Users want trails, campsites, restaurants, and petrol stations visible in one place.

**Scope:**
- Map view per trip showing campsite location
- Nearby POIs: hiking trails, restaurants, fuel, supermarkets
- Save POIs to the trip itinerary
- Link to navigation app (Google Maps / Apple Maps)

---

## 📋 Priority 4 — Medium Demand

### 7. Day-by-Day Itinerary Builder
Gives the trip organiser structure beyond just the packing list. Helps larger groups stay coordinated.

**Scope:**
- Add activities, arrival/departure times, and notes per day
- Assign activities to group members
- Calendar sync (iOS/Google)
- View itinerary offline

---

### 8. Group Polls & Voting
Removes the "endless WhatsApp thread" problem for group decisions. Particularly useful in the trip planning stage.

**Scope:**
- Create a poll within a trip (destination, dates, activities, food)
- Members vote in-app
- Results visible in real time
- Polls linked to trip chat

---

### 9. Weather Alerts & Packing List Updates
Proactive notifications add genuine value and keep the app relevant in the days leading up to the trip.

**Scope:**
- Push notification if forecast changes significantly before trip
- Prompt to review/update packing list based on new forecast
- Severity threshold settings (e.g. only alert for rain, extreme cold)

---

### 10. Tabbed Packing List View
Currently the packing list shows Group Kit and Personal Kit stacked vertically, which makes for a long scroll on a phone. Replace stacked sections with clickable tabs so users can focus on one view at a time.

**Scope:**
- Tab bar at the top of the packing list with: **All / Group Kit / Personal Kit** (or potentially **Group / Personal / Scaled**)
- Selected tab is visually distinct (active state)
- Each tab shows a count badge (e.g. "Group Kit (24)" or "Personal (18)")
- Coverage progress per tab visible in the tab itself or just under it
- Sticky on scroll so tabs stay accessible on long lists
- Remember last-selected tab in local storage so it persists across visits
- Existing filters (All / Unclaimed / Mine / Covered) continue to work within the active tab

---

## 💡 Priority 5 — Nice to Have

### 11. Post-Trip Journal & Photo Album
Valued but lower priority — most users already use Instagram or Google Photos. Worth considering as a future differentiator.

**Scope:**
- Per-trip photo album shared with group
- Trip notes / journal entry
- "What we forgot" notes to improve future packing lists
- Rate and review the campsite

---

### 12. Campsite Search & Reviews
Heavily covered by The Dyrt, Hipcamp, and similar apps. Better to integrate with these than rebuild.

**Scope:**
- Embed campsite search via third-party integration
- Pull in reviews and ratings
- Direct booking link out to third-party provider

---

## 🛠️ Infrastructure & Tooling

### Staging Environment
A separate, deployed copy of the app running at its own URL, used for testing changes before they reach production. Lets us verify features end-to-end (including auth, push notifications, and Supabase RLS) without risking the live environment.

**Scope:**
- Dedicated staging URL (e.g. `staging.camp-pal.app` or a Vercel preview alias)
- Separate Supabase project (or schema) with isolated data so testing doesn't pollute production
- Separate environment variables / secrets per environment
- Auto-deploy on pushes to a `staging` branch (or all non-`main` branches)
- Visible "Staging" banner in the UI when running outside production
- Documented promotion flow: feature branch → staging → main

---

*Last updated: May 2026*
