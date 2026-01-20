# Gmail API Setup - Lettura Inbox

## Step 1: Abilita Gmail API

1. Vai su [Google Cloud Console](https://console.cloud.google.com)
2. Clicca **"+ Abilita API e servizi"** (bottone blu in alto)
3. Cerca **"Gmail API"**
4. Clicca su Gmail API → **Abilita**

## Step 2: OAuth Consent Screen

1. Menu sinistra → **Schermata consenso OAuth**
2. User Type: **Esterno** → Crea
3. Compila:
   - Nome app: `social-cli-mcp`
   - Email supporto: `flutur8i8@gmail.com`
   - Email sviluppatore: `flutur8i8@gmail.com`
4. **Salva e continua**
5. Scopes → **Aggiungi o rimuovi ambiti**
   - Cerca e aggiungi: `https://www.googleapis.com/auth/gmail.readonly`
6. **Salva e continua**
7. Test users → **Add users**
   - Aggiungi: `flutur8i8@gmail.com`
8. **Salva e continua**

## Step 3: Crea Credenziali OAuth

1. Menu sinistra → **Credenziali**
2. **+ Crea credenziali** → **ID client OAuth**
3. Tipo applicazione: **Applicazione desktop**
4. Nome: `social-cli-mcp`
5. **Crea**
6. **Scarica JSON** → Salva come `gmail-credentials.json` nella root del progetto

## Step 4: Aggiungi a .env

```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

## Step 5: Prima autorizzazione

La prima volta che usi lo script, si aprirà il browser per autorizzare.
Clicca "Continua" anche se dice "App non verificata" (è la tua app).

## File da creare dopo setup

Una volta completato, il token verrà salvato in `gmail-token.json`.

## Uso

```typescript
// Leggi email inviate a settembre per venues
const emails = await gmail.search('from:me after:2025/09/01 before:2025/10/01 venue booking');
```
