# Venue Database

Comprehensive database of sunset venues for Flutur outreach campaigns.

## Structure

```
venues/
├── README.md           # This file
├── italy.json          # 16 venues (Sardinia, Puglia, Amalfi, Sicily)
├── greece.json         # 12 venues (Athens, Rhodes, Crete, Corfu, Paros)
├── portugal.json       # 12 venues (Comporta, Lisbon, Algarve, Porto)
├── canary-islands.json # 12 venues (Tenerife, Gran Canaria, Lanzarote, Fuerteventura)
├── balearics.json      # 12 venues (Ibiza, Mallorca, Formentera, Menorca)
└── master-index.json   # Unified index of all venues
```

## Total Venues: 64

### By Region
| Region | Venues | Top Picks |
|--------|--------|-----------|
| Italy | 16 | Phi Beach, Nikki Beach Sardinia, Conca del Sogno |
| Greece | 12 | Bolivar Athens, Zamana Crete, Edem Corfu |
| Portugal | 12 | Sublime Comporta, Park Lisbon, Purobeach Vilamoura |
| Canary Islands | 12 | Papagayo Tenerife, Monkey Beach, Amadores |
| Balearics | 12 | Café del Mar, 7Pines, Gecko Formentera |

### By Segment
| Segment | Count | GGT Appropriate |
|---------|-------|-----------------|
| Beach Club | 48 | ✅ Yes |
| Boutique Hotel | 12 | ⚠️ Optional |
| Wellness | 4 | ❌ No |

## Venue Fields

Each venue JSON includes:

```json
{
  "id": "unique_identifier",
  "venue_name": "Name",
  "region": "Country - Area",
  "type": "Beach Club | Boutique Hotel | Rooftop Bar | Wellness",
  "address": "Full address",
  "contact_email": "email@venue.com",
  "contact_phone": "+XX XXX XXX XXX",
  "website": "venue.com",
  "music_style": ["House", "Electronic", "Live"],
  "why_good_fit": "Reason this venue fits Flutur's hybrid live+DJ sunset format",
  "segment": "beach_club | boutique_hotel | wellness | festival",
  "ggt_appropriate": true | false,
  "recommended_video": "Rocca di Arona | Ben Böhmer style | Efthymia | GGT",
  "tier": 1 | 2,
  "operating_season": "Month to Month"
}
```

## Video Selection Guide

| Video | Use For | Venues |
|-------|---------|--------|
| **Rocca di Arona** | Sunset sessions, organic house | Most beach clubs |
| **Ben Böhmer style** | Club venues, daytime parties | High-energy clubs |
| **Efthymia** | Wellness, meditation, boutique hotels | Retreats, quiet hotels |
| **GGT** | Festivals, unique venues | Festival submissions |

## Outreach Status Tracking

Each venue can have status:
- `pending` - Not yet contacted
- `sent` - Initial email sent
- `followed_up` - Follow-up sent
- `replied` - Response received
- `booked` - Confirmed booking
- `rejected` - Declined

## Usage

### Load all venues
```typescript
import italyVenues from './venues/italy.json';
import greeceVenues from './venues/greece.json';
// etc.

const allVenues = [
  ...italyVenues,
  ...greeceVenues,
  ...portugalVenues,
  ...canaryVenues,
  ...balearicsVenues
];
```

### Filter by segment
```typescript
const beachClubs = allVenues.filter(v => v.segment === 'beach_club');
const wellness = allVenues.filter(v => v.segment === 'wellness');
```

### Filter by GGT appropriateness
```typescript
const ggtOk = allVenues.filter(v => v.ggt_appropriate);
const noGgt = allVenues.filter(v => !v.ggt_appropriate);
```

## Last Updated
2026-01-20
