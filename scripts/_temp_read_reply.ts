import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { loadSecretsToEnv } from '../src/keychain.js';

loadSecretsToEnv();

const imap = new Imap({
  user: process.env.GMAIL_USER!,
  password: process.env.GMAIL_APP_PASSWORD!,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

// Search terms for venue replies
const searchTerms = [
  'lapetitehalle',
  'icti.fr',
  'ecstaticdanceandvoiceportugal',
  'filodivino',
];

imap.once('ready', () => {
  imap.openBox('INBOX', true, (err, box) => {
    if (err) { console.error(err); imap.end(); return; }

    // Search last 21 days for venue-related subjects
    const since = new Date();
    since.setDate(since.getDate() - 21);

    imap.search([
      ['SINCE', since.toISOString().split('T')[0]],
      ['OR',
        ['OR',
          ['FROM', 'icti.fr'],
          ['FROM', 'ecstaticdanceandvoiceportugal']
        ],
        ['OR',
          ['FROM', 'filodivino'],
          ['FROM', 'lapetitehalle']
        ]
      ]
    ], (err, uids) => {
      if (err) {
        console.error('Search error:', err.message);
        // Fallback: search by subject
        imap.search([
          ['SINCE', since.toISOString().split('T')[0]],
          ['SUBJECT', 'Re: Live Looping']
        ], (err2, uids2) => {
          if (err2 || !uids2?.length) {
            console.log('Trying broader search...');
            broadSearch(since);
            return;
          }
          fetchAll(uids2);
        });
        return;
      }

      if (!uids?.length) {
        console.log('Direct search empty, trying broader...');
        broadSearch(since);
        return;
      }
      fetchAll(uids);
    });

    function broadSearch(since: Date) {
      imap.search([
        ['SINCE', since.toISOString().split('T')[0]],
      ], (err, uids) => {
        if (err || !uids?.length) {
          console.log('No emails found');
          imap.end();
          return;
        }

        console.log(`Scanning ${uids.length} emails for venue replies...\n`);
        let found = 0;
        let processed = 0;

        const f = imap.fetch(uids, { bodies: '', struct: true });
        f.on('message', (msg) => {
          msg.on('body', async (stream) => {
            try {
              const parsed = await simpleParser(stream);
              const from = (parsed.from?.text || '').toLowerCase();
              const subject = (parsed.subject || '').toLowerCase();

              const isVenueReply = searchTerms.some(t => from.includes(t)) ||
                (subject.includes('re:') && (
                  subject.includes('live looping') ||
                  subject.includes('rav vast') ||
                  subject.includes('sunset session') ||
                  subject.includes('sound journey') ||
                  subject.includes('sound healing') ||
                  subject.includes('ecstatic dance') ||
                  subject.includes('artist application') ||
                  subject.includes('filodivino')
                ));

              // Also catch direct replies from venues
              const isVenueDirect = from.includes('filodivino') ||
                from.includes('mandali') ||
                from.includes('shantispace') ||
                from.includes('ecstaticdance');

              if ((isVenueReply || isVenueDirect) && !from.includes('flutur')) {
                found++;
                console.log('═'.repeat(60));
                console.log(`📧 #${found}`);
                console.log(`Date: ${parsed.date?.toLocaleString('it-IT')}`);
                console.log(`From: ${parsed.from?.text}`);
                console.log(`Subject: ${parsed.subject}`);
                console.log(`\n${parsed.text || '(HTML only - check Gmail)'}`);
                console.log('═'.repeat(60) + '\n');
              }
            } catch {}
            processed++;
          });
        });

        f.once('end', () => {
          const wait = setInterval(() => {
            if (processed >= uids.length) {
              clearInterval(wait);
              console.log(`\nFound ${found} venue replies.`);
              imap.end();
            }
          }, 200);
          setTimeout(() => { clearInterval(wait); imap.end(); }, 30000);
        });
      });
    }

    function fetchAll(uids: number[]) {
      console.log(`Found ${uids.length} matching emails\n`);
      const f = imap.fetch(uids, { bodies: '', struct: true });
      f.on('message', (msg) => {
        msg.on('body', async (stream) => {
          const parsed = await simpleParser(stream);
          console.log('═'.repeat(60));
          console.log(`Date: ${parsed.date?.toLocaleString('it-IT')}`);
          console.log(`From: ${parsed.from?.text}`);
          console.log(`Subject: ${parsed.subject}`);
          console.log(`\n${parsed.text || '(HTML only - check Gmail)'}`);
          console.log('═'.repeat(60) + '\n');
        });
      });
      f.once('end', () => {
        setTimeout(() => imap.end(), 3000);
      });
    }
  });
});

imap.once('error', (err: Error) => {
  console.error('IMAP error:', err.message);
});

imap.connect();
