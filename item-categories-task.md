# Item Categories — Implementation Task

## Overview

Implement a `itemType` field across all packing list items to distinguish between:

| Type | Description | Claiming Behaviour |
|------|-------------|-------------------|
| `group` | One item shared by the whole group | One person claims it — done |
| `personal` | Every individual needs their own | Each member confirms independently |
| `scaled` | Quantity depends on group size / trip length | Auto-suggests quantity based on headcount & nights |

---

## Tasks

- [x] Add `itemType` field to item schema (`"group" | "personal" | "scaled"`)
- [x] Add optional `scaledMultiplier` field for scaled items (e.g. `per_person`, `per_night`, `per_person_per_night`)
- [x] Update claiming logic per type (see Claiming Behaviour above)
- [x] Split packing list UI into **Group Kit** and **Personal Kit** sections
- [x] Group Kit: show claimed/unclaimed + who is bringing it
- [x] Personal Kit: show per-member confirmation progress (e.g. 4/6 confirmed)
- [x] Scaled items: show suggested quantity with manual override
- [x] Allow users to override `itemType` per item per trip
- [x] Update AI packing list generation prompt to assign `itemType` to each generated item

---

## Item Type Reference

Review and adjust as needed — edge cases like tents and chairs depend on group setup.

### 🏕️ Shelter

| Item | Type | Notes |
|------|------|-------|
| Tent | personal | Each person/couple brings their own |
| Tent pegs | personal | Goes with each tent |
| Tent footprint / groundsheet | personal | Goes with each tent |
| Tarp / shelter | group | One shared rain shelter for the group |
| Mallet / hammer | group | One needed for the group |

---

### 🛏️ Sleeping

| Item | Type | Notes |
|------|------|-------|
| Sleeping bag | personal | |
| Sleeping mat / pad | personal | |
| Pillow | personal | |
| Eye mask | personal | |
| Earplugs | personal | |

---

### 🍳 Cooking & Food

| Item | Type | Notes |
|------|------|-------|
| Camp stove | group | One or two depending on group size |
| Gas canisters / fuel | scaled | Per night |
| BBQ / grill | group | |
| BBQ tools (tongs, brush) | group | |
| Cooking pot | group | |
| Frying pan | group | |
| Kettle | group | |
| Chopping board | group | |
| Knife set | group | |
| Can opener | group | |
| Corkscrew / bottle opener | group | |
| Washing up bowl | group | |
| Washing up liquid | group | |
| Sponge / scrubber | group | |
| Tin foil | group | |
| Food storage bags / containers | group | |
| Cooler / cool box | group | |
| Ice packs | group | |
| Water carrier / jerry can | group | |
| Water filter | group | |
| Plates | scaled | Per person |
| Bowls | scaled | Per person |
| Mugs | scaled | Per person |
| Cutlery (knife, fork, spoon) | scaled | Per person |
| Cups / glasses | scaled | Per person |

---

### 🍱 Food & Drink

| Item | Type | Notes |
|------|------|-------|
| Breakfast food | scaled | Per person per day |
| Lunch food | scaled | Per person per day |
| Dinner food | scaled | Per person per day |
| Snacks | scaled | Per person |
| Tea / coffee | group | |
| Sugar / condiments | group | |
| Cooking oil | group | |
| Salt & pepper | group | |
| Water (bottled) | scaled | Per person per day |
| Drinks / alcohol | personal | Each person brings their own |

---

### 👕 Clothing

| Item | Type | Notes |
|------|------|-------|
| Base layers | personal | |
| Mid layers / fleece | personal | |
| Waterproof jacket | personal | |
| Waterproof trousers | personal | |
| T-shirts | personal | |
| Shorts | personal | |
| Warm trousers | personal | |
| Socks | personal | |
| Underwear | personal | |
| Hiking boots | personal | |
| Camp shoes / sandals | personal | |
| Hat (warm) | personal | |
| Sun hat | personal | |
| Gloves | personal | |
| Buff / neck gaiter | personal | |

---

### 🧴 Toiletries & Hygiene

| Item | Type | Notes |
|------|------|-------|
| Toothbrush | personal | |
| Toothpaste | personal | |
| Soap / body wash | personal | |
| Shampoo | personal | |
| Deodorant | personal | |
| Toilet paper | scaled | Per person |
| Hand sanitiser | group | |
| Wet wipes | group | |
| Trowel (for wild camping) | group | |
| Biodegradable waste bags | group | |
| Sunscreen | personal | |
| Lip balm | personal | |
| Insect repellent | personal | |
| Feminine hygiene products | personal | |
| Towel | personal | |

---

### 🩹 First Aid & Safety

| Item | Type | Notes |
|------|------|-------|
| First aid kit | group | One comprehensive kit for the group |
| Blister plasters | personal | |
| Personal medication | personal | |
| Antihistamines | group | |
| Pain relief (ibuprofen/paracetamol) | group | |
| Emergency whistle | personal | |
| Fire extinguisher / fire blanket | group | |
| Emergency contact list | group | |

---

### 🔦 Lighting

| Item | Type | Notes |
|------|------|-------|
| Headtorch | personal | |
| Spare batteries | group | |
| Lantern | group | |
| Fairy lights / ambient lighting | group | |

---

### 🧭 Navigation & Communication

| Item | Type | Notes |
|------|------|-------|
| Map of the area | group | |
| Compass | group | |
| GPS device | group | |
| Walkie talkies | group | |
| Portable phone charger / power bank | personal | |
| Solar charger | group | |
| Car phone mount | group | |

---

### 🪑 Furniture & Comfort

| Item | Type | Notes |
|------|------|-------|
| Camp chair | personal | Each person brings their own |
| Camp table | group | One shared table |
| Hammock | personal | |

---

### 🔥 Campfire

| Item | Type | Notes |
|------|------|-------|
| Firewood | scaled | Per night |
| Firelighters | group | |
| Matches / lighter | group | |
| Axe / hatchet | group | |
| Fire pit / fire ring | group | |
| Marshmallows / campfire food | scaled | Per person |

---

### 🎒 General Kit

| Item | Type | Notes |
|------|------|-------|
| Backpack / daypack | personal | |
| Dry bags | personal | |
| Duct tape | group | |
| Rope / paracord | group | |
| Carabiners | group | |
| Multi-tool / Swiss Army knife | group | |
| Bin bags | group | |
| Washing line | group | |
| Clothes pegs | group | |
| Doormat / boot scraper | group | |

---

## Edge Cases to Review

These items may need to be adjusted based on trip type or group preference:

- **Tent** — tagged as `personal` but couples/pairs often share. Consider a "shared with" option.
- **Camp stove** — tagged as `group` but larger groups may need two. Consider `scaled` with a threshold (e.g. 1 per 4 people).
- **Camp chair** — tagged as `personal` but some groups share or borrow. Easy to override.
- **Drinks/alcohol** — tagged as `personal` but some groups do a shared drinks pool.
- **Sunscreen / insect repellent** — tagged as `personal` but often shared. Group override makes sense.

---

*Last updated: May 2026*
