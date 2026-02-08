# Claude Deep Research - Venue Discovery Prompt

> Copia e usa questo prompt con Claude Deep Research per trovare nuovi venue.
> Sostituisci `[REGION/COUNTRY]` con la zona target.

---

```
# VENUE RESEARCH FOR FLUTUR - Live Sound Journey Artist

## ABOUT THE ARTIST (for context)
FLUTUR is a live performer specializing in "Ceremonial Electronics" - a unique blend of:
- RAV Vast (steel tongue drum) sound healing
- Live looping & electronic production
- Vocals & guitar
- Setup scales from intimate meditation to full energy dance floor

**Key Credentials:**
- RAV Vast Endorsed Artist
- 4-year sunset ceremony residency at Villa Porta (Lake Maggiore luxury hotel)
- Main stage at Drishti Beats Festival 2023 (Aspen, Colorado)
- Opened for IHF (played Coachella, Electric Forest)
- Collaboration with Equanimous (100M+ streams on Gravitas Recordings)
- Greece's Got Talent - 4 YES votes

**Available:** Summer 2026, worldwide (based in Italy/Greece)

---

## RESEARCH REQUEST

Search for venues, festivals, and spaces in [REGION/COUNTRY] that would be ideal for this artist. Focus on:

### 1. SUNSET/BEACH VENUES
- Beach clubs with live music programs (not just DJs)
- Rooftop bars with sunset sessions
- Boutique hotels with guest entertainment
- Examples of vibe: Scorpios Mykonos, Papaya Playa Project, Habitas

### 2. CONSCIOUS/WELLNESS FESTIVALS
- Yoga & music festivals
- Transformational festivals
- Ecstatic dance events
- Sound healing gatherings
- Examples: BaliSpirit, Envision, Symbiosis, Lightning in a Bottle

### 3. RETREAT CENTERS
- Yoga retreats that host visiting teachers
- Wellness resorts with programming
- Meditation centers
- Examples: Mandali, Esalen, Rythmia

### 4. ECSTATIC DANCE COMMUNITIES
- Regular ecstatic dance events
- Cacao ceremonies with music
- Breathwork + live music events

### 5. UNIQUE VENUES
- Cave venues, ancient theaters
- Castle/monastery event spaces
- Nature amphitheaters

---

## FOR EACH VENUE FOUND, PROVIDE:

1. **Name & Location**
2. **Website**
3. **Contact email** (booking/events/info)
4. **Type** (beach_club / festival / retreat / ecstatic_dance / hotel / unique_venue)
5. **Why good fit** (1 sentence)
6. **Booking window** (when they book artists)
7. **Tier** (1 = cold email OK, 2 = needs intro, 3 = very exclusive)
8. **Social proof needed** (what would impress them)

---

## OUTPUT FORMAT

Return as JSON array:
```json
[
  {
    "name": "Venue Name",
    "location": "City, Country",
    "country": "Country",
    "website": "https://...",
    "email": "booking@...",
    "type": "beach_club",
    "whyFit": "Known for sunset ceremonies, hosts live musicians",
    "bookingWindow": "January-March for summer",
    "tier": 1,
    "socialProof": "Festival main stage experience",
    "source": "deep_research_YYYY-MM-DD"
  }
]
```

---

## REGIONS TO PRIORITIZE

1. **Greece** - Islands (Mykonos, Paros, Ios, Crete, Rhodes)
2. **Spain** - Ibiza, Canary Islands, Costa Brava
3. **Portugal** - Algarve, Lisbon area, Comporta
4. **Italy** - Puglia, Sardinia, Amalfi, Sicily, Lake Como
5. **Bali & Thailand** - Ubud, Canggu, Koh Phangan
6. **Mexico** - Tulum, Oaxaca
7. **Germany** - Berlin (ecstatic dance scene)

---

## EXCLUDE

- Pure nightclubs (no live music appreciation)
- Corporate hotel chains without boutique programming
- Venues that only book big names
- Places that closed or have no 2025-2026 activity
```

---

## Import to Database

Dopo aver ricevuto i risultati, salva il JSON in:
```
content/outreach/venues/deep-research-YYYY-MM-DD.json
```

Poi importa con:
```bash
npx tsx scripts/import-deep-research-venues.ts
```

Lo script evita automaticamente i doppioni controllando nomi ed email esistenti.
