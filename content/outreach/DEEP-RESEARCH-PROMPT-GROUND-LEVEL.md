# Deep Research Prompt: Ground Level Circuit

> **Obiettivo**: Trovare venue ACCESSIBILI dove suonare DAVVERO. Non prestigio, ma VOLUME di date.
> Chiringuitos, beach bar locali, booking agent per circuiti, venue che bookano regolarmente.

---

## PROMPT PER CLAUDE DEEP RESEARCH

```
Sei un ricercatore specializzato nel circuito musicale "ground level" europeo e mediterraneo.

## CHI SONO

FLUTUR - Live performer italiano con:
- RAV Vast (steel tongue drum) + live looping + chitarra + voce
- Sound: ambient/organic/world music - perfetto per aperitivo e sunset
- Setup: autonomo, minimo ingombro, niente palco enorme necessario
- Flessibilità: 45min acoustic set → 3h DJ-hybrid set
- Credenziali: Greece's Got Talent (4 SÌ), 4 anni residenza hotel lusso

**NON cerco prestigio. Cerco DATE. Tante. Regolari.**

---

## COSA CERCARE

### 1. CHIRINGUITOS & BEACH BAR (Volume Play)
Beach bar medio-piccoli che hanno musica live regolare (non i mega-club).

**Regioni prioritarie:**
- **Grecia**: Isole minori (Naxos, Paros, Milos, Sifnos, Folegandros, Antiparos), costa Peloponneso, Halkidiki
- **Spagna**: Costa Brava, Valencia, Murcia, Andalusia (NON solo Ibiza), Canarie
- **Portogallo**: Algarve (Lagos, Sagres, Tavira), Costa Vicentina, Cascais
- **Italia**: Puglia, Calabria, Sicilia, Sardegna (non solo Costa Smeralda), Liguria, Cinque Terre
- **Croazia**: Istria, isole (Hvar, Vis, Korčula, Brač) - venue più accessibili

**Caratteristiche ideali:**
- Musica live almeno 2-3 volte/settimana in stagione
- Pubblico: turisti + locali mix
- Budget booking: €200-600/serata (realistico per venue piccoli)
- Contatto diretto (no intermediari infiniti)

### 2. BOOKING AGENTS "WORKING MUSICIAN"
Agenzie che gestiscono circuiti di venue per artisti live, NON mega-festival.

**Tipo di agenzie:**
- Circuiti hotel/resort (stagionali)
- Network beach bar/chiringuitos
- Agenzie per eventi privati/corporate (wedding, retreat)
- Cooperative di venue che condividono roster

**Paesi**: Spagna, Grecia, Portogallo, Italia, Croazia, Francia sud

**Red flags da evitare:**
- Agenzie che chiedono fee upfront
- "Pay to play" schemes
- Agenzie solo per DJ (no live)

### 3. HOTEL & RESORT CON PROGRAMMA MUSICALE
Hotel 3-4 stelle con aperitivo/cena live regolare (non solo 5 stelle irraggiungibili).

**Target:**
- Boutique hotel con bar/terrazza
- Agriturismi con eventi
- Resort wellness medio (non Aman/Six Senses tier)
- Camping/glamping con programma serale

### 4. WINE BAR / ENOTECA CON LIVE
Venue più intimi ma con programmazione regolare.

### 5. CIRCUITI ECSTATIC DANCE MINORI
Community più piccole (non solo capitali) che organizzano eventi regolari.

---

## OUTPUT FORMAT (JSON)

Per ogni venue/agent trovato:

```json
{
  "name": "Nome Venue/Agent",
  "type": "beach_bar | booking_agent | hotel | wine_bar | ecstatic_dance",
  "location": "Città/Zona, Paese",
  "country": "Country",
  "region": "Regione specifica",
  "website": "URL",
  "email": "email@domain.com",
  "phone": "+XX XXX XXX XXXX",
  "instagram": "@handle",
  "musicFrequency": "daily | 3x_week | weekly | seasonal",
  "season": "May-Oct | Year-round | Summer only",
  "budgetRange": "€200-400 | €400-600 | negotiable",
  "bookingProcess": "direct_email | form | agent_only | instagram_dm",
  "whyGoodFit": "Perché questo venue è adatto",
  "insiderTip": "Come approcciare, quando contattare, cosa menzionare",
  "tier": 1
}
```

**Tier per questa ricerca:**
- Tier 1 = Contatto diretto facile, bookano regolarmente artisti simili
- Tier 2 = Serve un po' più di effort ma accessibile
- Tier 3 = Potrebbe servire referral ma non impossibile

---

## PRIORITÀ GEOGRAFICHE (per costruire mini-tour)

### GRECIA - Circuito Isole Minori
Naxos → Paros → Antiparos → Ios → Santorini (piccoli venue)
Milos → Sifnos → Serifos
Creta nord (Chania, Rethymno) - NO Heraklion mega-resort

### SPAGNA - Costa Non-Ibiza
Costa Brava: Cadaqués, Tossa de Mar, Begur, Palafrugell
Valencia/Alicante: Jávea, Dénia, Altea, Moraira
Andalusia: Tarifa, Zahara, Conil, Nerja
Canarie: Fuerteventura, Lanzarote, La Palma (più chill di Tenerife)

### PORTOGALLO - Oltre Comporta
Algarve ovest: Sagres, Lagos, Carrapateira
Costa Vicentina: Zambujeira, Odeceixe, Aljezur
Nord: Porto area beach bars, Viana do Castelo

### ITALIA - Sud & Isole
Puglia: Salento (Otranto, Gallipoli small bars, Santa Maria di Leuca)
Sicilia: Cefalù, San Vito Lo Capo, Favignana, Ortigia
Sardegna: Alghero, Bosa, Carloforte, Costa Verde (NOT Porto Cervo)
Calabria: Tropea, Scilla, costa ionica

### CROAZIA - Isole Accessibili
Istria: Rovinj, Poreč, Umag (wine bars, beach bars)
Isole: Vis, Korčula, Brač (più autentiche di Hvar centro)

---

## DOMANDE GUIDA PER LA RICERCA

1. "Beach bars with live music [location] 2024 2025"
2. "[Location] sunset sessions live music"
3. "Booking agency live musicians Mediterranean"
4. "Hotel entertainment manager [country]"
5. "[Location] acoustic live music venue"
6. "Chiringuito con musica dal vivo [location]"
7. "Live music summer season jobs Mediterranean"
8. Forums/gruppi Facebook per musicisti itineranti

---

## ESEMPIO OUTPUT ATTESO

```json
[
  {
    "name": "Banana Beach Bar",
    "type": "beach_bar",
    "location": "Agia Anna, Naxos",
    "country": "Greece",
    "region": "Cyclades",
    "website": "bananabeachnaxos.com",
    "email": "info@bananabeachnaxos.com",
    "instagram": "@bananabeachnaxos",
    "musicFrequency": "daily",
    "season": "May-Oct",
    "budgetRange": "€250-400",
    "bookingProcess": "direct_email",
    "whyGoodFit": "Daily sunset sessions, acoustic/chill vibe, book independent artists",
    "insiderTip": "Contact in Feb-March for summer season. Mention you're flexible on dates.",
    "tier": 1
  },
  {
    "name": "Mediterranean Music Agency",
    "type": "booking_agent",
    "location": "Barcelona",
    "country": "Spain",
    "website": "example.com",
    "email": "bookings@example.com",
    "roster": "50+ venues across Costa Brava and Balearics",
    "commission": "15-20%",
    "requirements": "EPK, video, 2 reference venues",
    "whyGoodFit": "Specialized in acoustic/organic live acts for beach venues",
    "insiderTip": "They prefer artists who can do full summer season (June-Sept)",
    "tier": 1
  }
]
```

---

## NOTA IMPORTANTE

**NON voglio:**
- Mega-club con booking fee €5000+
- Venue che bookano solo DJ
- Agenzie che gestiscono solo EDM/techno
- Festival con application fee
- Venue senza contatto diretto trovabile

**VOGLIO:**
- Venue dove posso mandare email e avere risposta
- Posti che apprezzano musica LIVE (non backing track)
- Circuiti dove artista singolo può fare 10-20 date in estate
- Booking agent onesti che lavorano per commissione (non upfront fee)

---

## DELIVERABLE

Lista di almeno 50-80 venue/agent con:
- Mix geografico (non tutto concentrato in un posto)
- Mix di tipi (beach bar 60%, hotel 20%, agent 10%, altro 10%)
- Focus su Tier 1 (facile da contattare)
- Info di contatto VERIFICATE (email che esistono davvero)
```

---

## COME USARE

1. Copia il prompt sopra
2. Incolla in Claude Deep Research
3. Aspetta risultati
4. Salva JSON in `content/outreach/venues/ground-level-YYYY-MM-DD.json`
5. Esegui: `npx tsx scripts/import-deep-research-venues.ts content/outreach/venues/ground-level-YYYY-MM-DD.json`
