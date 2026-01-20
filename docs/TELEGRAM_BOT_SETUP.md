# Telegram Bot Setup

Controlla lo status del progetto e interagisci con Claude da Telegram.

## 1. Crea il Bot

1. Apri Telegram e cerca **@BotFather**
2. Invia `/newbot`
3. Scegli un nome (es. "Flutur MCP Bot")
4. Scegli uno username (es. `flutur_mcp_bot`)
5. Copia il **token** che ricevi

## 2. Trova il tuo User ID

1. Cerca **@userinfobot** su Telegram
2. Invia `/start`
3. Copia il tuo **User ID** (numero)

## 3. Configura .env

Aggiungi al tuo `.env`:

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_USER_ID=987654321
ANTHROPIC_API_KEY=sk-ant-...
```

## 4. Avvia il Bot

```bash
npx tsx src/telegram-bot.ts
```

## 5. Usa il Bot

Apri la chat col tuo bot e:

- `/start` - Inizia
- `/status` - Stato outreach
- `/venues` - Lista venue
- `/stats` - Statistiche email
- `/tier1` - Venue Tier 1

Oppure scrivi qualsiasi domanda:
- "Quante email ho inviato?"
- "Quali venue non hanno risposto?"
- "Prepara un follow-up per Nammos"

## Deploy (Opzionale)

Per tenere il bot sempre attivo:

### Railway (consigliato)
```bash
# Installa Railway CLI
npm i -g @railway/cli

# Login e deploy
railway login
railway init
railway up
```

### PM2 (locale)
```bash
npm i -g pm2
pm2 start "npx tsx src/telegram-bot.ts" --name flutur-bot
pm2 save
```

## Sicurezza

- Il bot risponde SOLO al tuo `TELEGRAM_USER_ID`
- Non condividere mai il token
- Le credenziali sono nel .env (non committato)
