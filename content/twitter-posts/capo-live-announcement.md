# CAPO VST Live Session - Twitter Threads

> Data target: Weekend 1-2 Feb 2026
> Platform: X Space + YouTube Live (screen share)
> Obiettivo: Annunciare live + generare interesse per plugin

---

## THREAD 1: Main Announcement (Day 1 - Lunedì)

### Tweet 1 (Hook)
```
Ho costruito un VST looper con Claude.

Record. Jam. Auto-tempo sync con Ableton Link.

La prossima settimana vi mostro LIVE come l'ho fatto.

🧵👇
```

### Tweet 2 (Il problema)
```
Il problema:

Suoni un loop freestyle.
Poi devi calcolare BPM a mano.
Poi lo setti in Ableton.
Poi allinei tutto.

❌ Flow creativo distrutto.
```

### Tweet 3 (La soluzione)
```
CAPO risolve così:

1. Premi JAM → registra
2. Premi di nuovo → calcola BPM automaticamente
3. Ableton Link → tempo sync istantaneo

Un bottone. Zero math.
```

### Tweet 4 (Demo)
```
Demo di 30 secondi:

[VIDEO: registra loop 8 bar → press → Ableton sync automatico]

Il rosso pulsa mentre registri.
Il verde quando il loop gira.
Il tempo appare in verde.
```

### Tweet 5 (Tech stack)
```
Tech stack:

• Rust + nih-plug (VST3/CLAP framework)
• egui per la UI
• rusty_link per Ableton Link
• Claude per il 90% del codice

Sì, AI può scrivere plugin audio che funzionano.
```

### Tweet 6 (Live invite)
```
LIVE: Come costruire un VST con AI

📅 [DATA - weekend prossimo]
🎙️ X Space (audio + Q&A)
📺 YouTube (screen share codice)

Mostrerò:
• I prompt che ho usato
• Gli errori e come li ha fixati
• Come funziona Ableton Link

Segui per reminder.
```

### Tweet 7 (CTA)
```
Il plugin completo (CAPO) sarà disponibile a €5.

Ma il metodo per costruirlo?
Quello ve lo mostro gratis.

RT se vuoi il reminder per la live.

#buildinpublic #rustlang #vst #ableton #AI
```

---

## THREAD 2: Technical Deep Dive (Day 3 - Mercoledì)

### Tweet 1
```
Come ho fatto Ableton Link sync in Rust.

Claude ha fatto la maggior parte del lavoro.
Ma gli errori sono stati interessanti.

Un thread tecnico per chi vuole capire 🧵
```

### Tweet 2
```
Ableton Link è un protocollo peer-to-peer.

Qualsiasi app può:
• Settare il BPM della sessione
• Avviare/fermare il transport
• Sincronizzarsi con gli altri peer

Ma le bindings Rust (rusty_link) hanno quirks.
```

### Tweet 3
```
Il primo problema:

link.set_tempo(bpm) non basta.

Devi:
1. Catturare lo stato sessione
2. Modificarlo
3. Committarlo

Claude ha capito dopo 2 tentativi.
```

### Tweet 4
```
Il secondo problema più sottile:

Quando avvii il transport, il beat counter continua.

Se vuoi partire dal beat 0 (downbeat), devi chiamare:

set_is_playing_and_request_beat_at_time(true, time, 0.0, quantum)

Il "request" non è garantito.
```

### Tweet 5
```
La cosa che mi ha impressionato:

Ho descritto il comportamento desiderato in italiano.
Claude ha generato codice Rust idiomatico.

Non "funziona e basta".
Gestisce edge cases che non avevo considerato.
```

### Tweet 6
```
Screenshot: il prompt che ha generato il core

[SCREENSHOT: conversazione Claude con il prompt chiave]

Questo è quello che mostrerò nella live.
Il metodo, non solo il risultato.

#rustlang #ableton #abletonlink #buildinpublic
```

---

## THREAD 3: Live Reminder (Day 5 - Venerdì)

### Tweet 1
```
DOMANI: Live coding session

"Building a VST looper with AI"

🕐 [ORARIO]
🎙️ X Space: audio + Q&A
📺 YouTube: screen share

Non serve sapere Rust.
Non serve sapere di plugin.

Solo curiosità su come AI può creare software audio reale.
```

### Tweet 2
```
Cosa vedrete:

1. Demo del plugin finito (5 min)
2. I prompt che ho usato con Claude
3. Live coding di una feature
4. Q&A

Portatevi domande.
```

### Tweet 3
```
Set reminder:

🔔 Segui per notifica
📌 Bookmark questo thread

Linko lo Space 30 min prima.

A domani.

#vst #ableton #AI #buildinpublic #rustlang
```

---

## HASHTAG STRATEGY

### Primary (sempre)
- `#buildinpublic` - community forte
- `#rustlang` - developer audience
- `#AI` - curiosità generale

### Secondary (alternare)
- `#vst` / `#vst3` - audio dev niche
- `#ableton` / `#abletonlive` - producer audience
- `#musicproduction` - broader music tech
- `#opensource` - se repo pubblico
- `#livelooping` - performer audience

### Evitare
- `#chatgpt` - troppo generico, spam
- `#coding` - troppo broad
- Più di 5 hashtag per tweet

---

## TIMING OTTIMALE

| Giorno | Orario | Tipo Tweet |
|--------|--------|------------|
| Lun | 10:00 | Thread 1 (Announcement) |
| Mar | 14:00 | Quote RT con dettaglio |
| Mer | 10:00 | Thread 2 (Technical) |
| Gio | 18:00 | Teaser video 15s |
| Ven | 10:00 | Thread 3 (Reminder) |
| Sab | 30 min prima | Space link + YT link |

---

## NOTE PER VIDEO DEMO (30s)

**Shot list:**
1. [0-5s] Ableton con CAPO plugin aperto
2. [5-10s] Premi JAM → cerchio rosso pulsa
3. [10-18s] Suoni 4 bar chitarra/rav
4. [18-22s] Premi JAM → BPM appare, verde
5. [22-28s] Ableton transport parte, tutto in sync
6. [28-30s] Testo: "CAPO - One button. Auto tempo."

**Audio:** musica tua (no copyright issues)
**Export:** 1080x1920 (vertical per X/IG) + 1920x1080 (horizontal per YT)

---

*Generato: 2026-01-24*
