/**
 * Gmail OAuth2 Token Refresh/Re-authentication
 *
 * Run: npx tsx scripts/refresh-gmail-token.ts
 *
 * Se il token è solo scaduto (ha un refresh_token), prova a rinnovarlo.
 * Se è revocato o manca il refresh_token, apre il browser per ri-autenticarsi.
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as http from 'http';
import * as url from 'url';

const CREDENTIALS_FILE = 'gmail-credentials.json';
const TOKEN_FILE = 'gmail-token.json';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

async function main() {
  // 1. Carica le credenziali del progetto Google Cloud
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    console.error(`File ${CREDENTIALS_FILE} non trovato.`);
    console.error('Scaricalo da: Google Cloud Console → APIs → Credentials → OAuth 2.0 Client IDs → Download JSON');
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3456'
  );

  // 2. Prova a usare il token esistente
  if (fs.existsSync(TOKEN_FILE)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
    oauth2Client.setCredentials(token);

    // Se c'è un refresh_token, prova il refresh automatico
    if (token.refresh_token) {
      try {
        console.log('Tentativo di refresh automatico...');
        const { credentials: newToken } = await oauth2Client.refreshAccessToken();
        // Mantieni il refresh_token originale se il nuovo non lo include
        if (!newToken.refresh_token) {
          newToken.refresh_token = token.refresh_token;
        }
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(newToken, null, 2));
        console.log('Token rinnovato con successo.');

        // Test
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        console.log(`Connesso come: ${profile.data.emailAddress}`);
        process.exit(0);
      } catch (err: any) {
        console.log(`Refresh fallito: ${err.message}`);
        console.log('Serve ri-autenticazione completa.\n');
      }
    }
  }

  // 3. Ri-autenticazione completa via browser
  console.log('Apro il browser per autenticazione...\n');

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Forza la generazione di un nuovo refresh_token
  });

  // Server locale per ricevere il callback
  const server = http.createServer(async (req, res) => {
    const query = url.parse(req.url || '', true).query;
    const code = query.code as string;

    if (!code) {
      res.writeHead(400);
      res.end('Errore: nessun codice ricevuto');
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));

      oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>Gmail API autorizzata</h1>
          <p>Connesso come: <strong>${profile.data.emailAddress}</strong></p>
          <p>Puoi chiudere questa finestra.</p>
        </body></html>
      `);

      console.log(`Token salvato in ${TOKEN_FILE}`);
      console.log(`Connesso come: ${profile.data.emailAddress}`);

      server.close();
      process.exit(0);
    } catch (err: any) {
      res.writeHead(500);
      res.end(`Errore: ${err.message}`);
      console.error('Errore nel token exchange:', err.message);
    }
  });

  server.listen(3456, () => {
    console.log('Server callback in ascolto su http://localhost:3456');
    console.log(`\nApri questo URL nel browser:\n\n${authUrl}\n`);

    // Prova ad aprire il browser automaticamente
    import('child_process').then(({ exec }) => exec(`open "${authUrl}"`));
  });
}

main().catch(err => {
  console.error('Errore:', err.message);
  process.exit(1);
});
