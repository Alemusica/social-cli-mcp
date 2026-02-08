import nodemailer from 'nodemailer';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getKey(name: string): Promise<string> {
  const { stdout } = await execAsync(`security find-generic-password -a "${name}" -s "social-cli-mcp" -w 2>/dev/null`);
  return stdout.trim();
}

async function main() {
  const gmailUser = await getKey('GMAIL_USER');
  const gmailPass = await getKey('GMAIL_APP_PASSWORD');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const emailText = `Hi Johann!

Thanks for the reply. Vercel's json-render is interesting but opposite direction – they go AI → GUI, jsOM goes GUI → AI. Giving designers their workflow back, with precision no agnostic tool offers today.

Figma can export to React, sure – through 3rd party plugins. Not truly agnostic. jsOM is framework-agnostic at the core. Same design exports to React, Vue, Svelte, SwiftUI, Flutter – 11 targets.

The key combo: semantic layers + TOON.
- Semantic layers handle structure (navigation → <nav>, etc.)
- TOON handles token efficiency

Together: precise, compact, language-agnostic. Exactly what LLMs need.

TOON is already in jsOM. Now I'm refining how they work together – that's why I reached out. Your perspective on the edge cases would be really valuable.

Solo dev here, musician background – borrowed a lot from DAW precision workflows. Building in public. If you have a sec to check the repo, feedback or a ⭐ would mean a lot.

https://github.com/alemusica/jsom

Cheers,
Alessio`;

  const emailHtml = `<p>Hi Johann!</p>

<p>Thanks for the reply. Vercel's json-render is interesting but opposite direction – they go AI → GUI, jsOM goes <strong>GUI → AI</strong>. Giving designers their workflow back, with precision no agnostic tool offers today.</p>

<p>Figma can export to React, sure – through 3rd party plugins. Not truly agnostic. jsOM is <strong>framework-agnostic at the core</strong>. Same design exports to React, Vue, Svelte, SwiftUI, Flutter – 11 targets.</p>

<p>The key combo: <strong>semantic layers + TOON</strong>.</p>
<ul>
  <li>Semantic layers handle structure (<code>navigation</code> → <code>&lt;nav&gt;</code>, etc.)</li>
  <li>TOON handles token efficiency</li>
</ul>

<p>Together: precise, compact, language-agnostic. Exactly what LLMs need.</p>

<p>TOON is already in jsOM. Now I'm refining how they work together – that's why I reached out. Your perspective on the edge cases would be really valuable.</p>

<p>Solo dev here, musician background – borrowed a lot from DAW precision workflows. Building in public. If you have a sec to check the repo, feedback or a ⭐ would mean a lot.</p>

<p><a href="https://github.com/alemusica/jsom">https://github.com/alemusica/jsom</a></p>

<p>Cheers,<br>Alessio</p>`;

  const email = {
    from: gmailUser,
    to: 'johann@schopplich.com',
    subject: 'Re: jsOM × TOON integration idea',
    text: emailText,
    html: emailHtml
  };

  const result = await transporter.sendMail(email);
  console.log('✅ Email sent to Johann!');
  console.log('Message ID:', result.messageId);
}

main();
