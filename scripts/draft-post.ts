#!/usr/bin/env npx tsx
/**
 * Interactive Post Drafter
 *
 * Instead of inventing details, this script:
 * 1. Shows you content context from the database
 * 2. Asks you targeted questions
 * 3. Generates 3+ draft variations based on YOUR answers
 *
 * Usage:
 *   npx tsx scripts/draft-post.ts                    # Pick from ready content
 *   npx tsx scripts/draft-post.ts <content_id>      # Draft for specific content
 *   npx tsx scripts/draft-post.ts --platform=twitter # For Twitter
 */

import * as readline from 'readline';
import {
  startDraftSession,
  completeDraftSession,
  getContentReadyForDrafting,
  type DraftSession,
  type DraftQuestion,
  type PostDraft,
} from '../src/core/content-drafter.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function printSeparator(char: string = '─', length: number = 60) {
  console.log(char.repeat(length));
}

function printHeader(text: string) {
  console.log('\n');
  printSeparator('═');
  console.log(`  ${text}`);
  printSeparator('═');
}

async function selectContent(): Promise<string> {
  console.log('\n📷 Contenuti pronti per drafting:\n');

  const ready = await getContentReadyForDrafting(10);

  if (ready.length === 0) {
    console.log('❌ Nessun contenuto pronto. Esegui prima l\'analisi vision.');
    console.log('   npx tsx src/analysis/analyze-content-vision.ts');
    process.exit(1);
  }

  for (let i = 0; i < ready.length; i++) {
    const c = ready[i];
    const score = c.quality_score ? `⭐${c.quality_score}` : '';
    const loc = c.location ? `📍${c.location.substring(0, 20)}` : '';
    const cat = c.category ? `[${c.category}]` : '';

    console.log(`  ${i + 1}. ${c.file_name}`);
    console.log(`     ${cat} ${score} ${loc}`);
    if (c.mood) console.log(`     Mood: ${c.mood}`);
    console.log('');
  }

  const choice = await ask('Scegli (numero): ');
  const idx = parseInt(choice) - 1;

  if (idx < 0 || idx >= ready.length) {
    console.log('Scelta non valida.');
    process.exit(1);
  }

  return ready[idx].id;
}

async function runInterviewPhase(session: DraftSession): Promise<Record<string, string>> {
  printHeader('📸 CONTESTO CONTENUTO');

  const c = session.content;
  console.log(`\nFile: ${c.file_name}`);
  if (c.location) console.log(`Luogo: ${c.location}`);
  if (c.taken_at) console.log(`Data: ${new Date(c.taken_at).toLocaleDateString('it-IT')}`);
  if (c.category) console.log(`Categoria: ${c.category}`);
  if (c.mood) console.log(`Mood analizzato: ${c.mood}`);
  if (c.tags?.length) console.log(`Tags: ${c.tags.join(', ')}`);
  if (c.suggested_caption) console.log(`\nCaption suggerita (AI): "${c.suggested_caption}"`);

  if (c.related_gig) {
    console.log(`\n🎸 GIG CORRELATO:`);
    console.log(`   ${c.related_gig.name} - ${c.related_gig.venue_name || c.related_gig.city}`);
    if (c.related_gig.story_context) console.log(`   Contesto: ${c.related_gig.story_context}`);
  }

  printHeader('❓ DOMANDE PER TE');

  console.log('\nRispondi per creare bozze autentiche (non inventate).\n');

  const answers: Record<string, string> = {};

  for (const q of session.questions) {
    printSeparator('─', 50);
    console.log(`\n💬 ${q.question}`);
    console.log(`   (${q.context})`);

    if (q.type === 'choice' && q.options) {
      console.log('\n   Opzioni:');
      q.options.forEach((opt, i) => console.log(`   ${i + 1}. ${opt}`));
      const choice = await ask('\n   Scelta (numero o testo): ');

      const choiceIdx = parseInt(choice) - 1;
      if (choiceIdx >= 0 && choiceIdx < q.options.length) {
        answers[q.id] = q.options[choiceIdx];
      } else {
        answers[q.id] = choice;
      }
    } else {
      const answer = await ask('\n   → ');
      answers[q.id] = answer;
    }

    if (!answers[q.id] && q.required) {
      console.log('   ⚠️  Risposta richiesta.');
      const retry = await ask('   → ');
      answers[q.id] = retry;
    }
  }

  return answers;
}

function printDrafts(drafts: PostDraft[]) {
  printHeader('✍️ BOZZE GENERATE');

  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    console.log(`\n┌${'─'.repeat(58)}┐`);
    console.log(`│ BOZZA ${i + 1}: ${d.style.toUpperCase().padEnd(45)} │`);
    console.log(`├${'─'.repeat(58)}┤`);

    // Caption wrapped
    const captionLines = wrapText(d.caption, 54);
    for (const line of captionLines) {
      console.log(`│  ${line.padEnd(55)} │`);
    }

    console.log(`│${'─'.repeat(58)}│`);
    console.log(`│  #️⃣  ${d.hashtags.map(h => '#' + h).join(' ').substring(0, 50).padEnd(52)} │`);

    if (d.cta) {
      console.log(`│  📣 CTA: ${d.cta.substring(0, 46).padEnd(46)} │`);
    }

    console.log(`├${'─'.repeat(58)}┤`);
    const noteLines = wrapText(`💡 ${d.notes}`, 54);
    for (const line of noteLines) {
      console.log(`│  ${line.padEnd(55)} │`);
    }
    console.log(`└${'─'.repeat(58)}┘`);
  }
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxWidth) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.length > 0 ? lines : [''];
}

async function main() {
  const args = process.argv.slice(2);
  const contentIdArg = args.find(a => !a.startsWith('--'));
  const platformArg = args.find(a => a.startsWith('--platform='))?.split('=')[1] || 'instagram';
  const typeArg = args.find(a => a.startsWith('--type='))?.split('=')[1] || 'feed';

  console.log('📝 INTERACTIVE POST DRAFTER');
  console.log('   Bozze basate sulle TUE risposte, non inventate.\n');

  try {
    // Get content ID
    const contentId = contentIdArg || await selectContent();

    // Start session
    console.log('\n⏳ Caricamento contesto...');
    const session = await startDraftSession(contentId, platformArg, typeArg);

    // Run interview
    const answers = await runInterviewPhase(session);

    // Generate drafts
    console.log('\n⏳ Generazione bozze basate sulle tue risposte...');
    const result = await completeDraftSession(session, answers);

    // Print drafts
    printDrafts(result.drafts);

    // Ask which to use
    printSeparator('═');
    console.log('\n📌 Quale bozza preferisci?');
    console.log('   (Puoi combinarle o modificarle manualmente)\n');

    const preference = await ask('Numero bozza (o "skip"): ');

    if (preference.toLowerCase() !== 'skip') {
      const idx = parseInt(preference) - 1;
      if (idx >= 0 && idx < result.drafts.length) {
        const chosen = result.drafts[idx];
        console.log('\n✅ Bozza selezionata:');
        console.log('─'.repeat(60));
        console.log(chosen.caption);
        console.log('─'.repeat(60));
        console.log(`Hashtags: ${chosen.hashtags.map(h => '#' + h).join(' ')}`);
      }
    }

    console.log('\n💡 Prossimi passi:');
    console.log('   1. Modifica la bozza se serve');
    console.log('   2. Posta manualmente o usa gli script di posting');
    console.log('   3. Tracka performance in SurrealDB');

  } catch (error: any) {
    console.error('❌ Errore:', error.message);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
