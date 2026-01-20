/**
 * Security Gate - Request confirmation via Telegram before sensitive actions
 *
 * This module allows CLI/API actions to request user confirmation via Telegram
 * before executing sensitive operations like sending emails or tweets.
 */

import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { loadSecretsToEnv } from './keychain.js';

// Load secrets from Keychain first (priority), then .env as fallback
loadSecretsToEnv();
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const USER_ID = process.env.TELEGRAM_USER_ID;

interface PendingAction {
  id: string;
  type: 'tweet' | 'email' | 'instagram';
  data: any;
  resolve: (confirmed: boolean) => void;
  expiresAt: Date;
}

// In-memory pending actions (shared with bot if running in same process)
export const pendingConfirmations = new Map<string, PendingAction>();

/**
 * Send a confirmation request to Telegram and wait for user response
 */
export async function requestConfirmation(
  type: 'tweet' | 'email' | 'instagram',
  data: any,
  preview: string,
  timeoutMs: number = 300000 // 5 minutes
): Promise<boolean> {
  if (!BOT_TOKEN || !USER_ID) {
    console.log('⚠️ Telegram not configured - skipping confirmation');
    return true; // Allow action if Telegram not configured
  }

  const actionId = crypto.randomBytes(8).toString('hex');

  // Create inline keyboard
  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Conferma', callback_data: `confirm_${actionId}` },
        { text: '❌ Annulla', callback_data: `cancel_${actionId}` },
      ],
    ],
  };

  let message = '';
  if (type === 'tweet') {
    message = `🔐 **Conferma Tweet (da CLI)**\n\n"${preview}"\n\n📊 ${preview.length}/280 caratteri\n⏰ Scade in 5 minuti`;
  } else if (type === 'email') {
    message = `🔐 **Conferma Email (da CLI)**\n\n📧 **A:** ${data.to}\n📝 **Oggetto:** ${data.subject}\n\n**Anteprima:**\n${preview.substring(0, 200)}...\n\n⏰ Scade in 5 minuti`;
  } else if (type === 'instagram') {
    const postType = data.postType || 'feed';
    const typeEmoji = postType === 'reels' ? '🎬' : postType === 'stories' ? '📖' : '📸';
    message = `🔐 **Conferma Instagram ${typeEmoji} (da CLI)**\n\n**Tipo:** ${postType}\n**Caption:** "${preview.substring(0, 150)}..."\n**Media:** ${data.mediaUrls?.length || 0} file\n\n⏰ Scade in 5 minuti`;
  }

  // Send message via Telegram API
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: USER_ID,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to send Telegram confirmation:', error);
    return false;
  }

  console.log(`🔐 Confirmation request sent to Telegram (ID: ${actionId})`);
  console.log('⏳ Waiting for user confirmation...');

  // Wait for confirmation (polling approach for CLI)
  return new Promise((resolve) => {
    const startTime = Date.now();

    pendingConfirmations.set(actionId, {
      id: actionId,
      type,
      data,
      resolve,
      expiresAt: new Date(Date.now() + timeoutMs),
    });

    // Poll for updates
    const pollInterval = setInterval(async () => {
      // Check if action was confirmed/cancelled
      if (!pendingConfirmations.has(actionId)) {
        clearInterval(pollInterval);
        return;
      }

      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(pollInterval);
        pendingConfirmations.delete(actionId);
        console.log('⏰ Confirmation timed out');
        resolve(false);
        return;
      }

      // Get updates from Telegram
      try {
        const updatesResponse = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-1&timeout=1`
        );
        const updates = await updatesResponse.json() as { result?: any[] };

        if (updates.result) {
          for (const update of updates.result) {
            const callbackData = update.callback_query?.data;
            if (callbackData === `confirm_${actionId}`) {
              clearInterval(pollInterval);
              pendingConfirmations.delete(actionId);

              // Answer callback
              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: update.callback_query.id,
                  text: '✅ Confermato!',
                }),
              });

              console.log('✅ User confirmed action');
              resolve(true);
              return;
            } else if (callbackData === `cancel_${actionId}`) {
              clearInterval(pollInterval);
              pendingConfirmations.delete(actionId);

              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: update.callback_query.id,
                  text: '❌ Annullato',
                }),
              });

              console.log('❌ User cancelled action');
              resolve(false);
              return;
            }
          }
        }
      } catch (error) {
        // Ignore polling errors
      }
    }, 2000); // Poll every 2 seconds
  });
}

/**
 * Send email with Telegram confirmation
 */
export async function sendEmailWithConfirmation(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string; error?: string; cancelled?: boolean }> {
  const preview = html.replace(/<[^>]*>/g, '').substring(0, 200);

  const confirmed = await requestConfirmation('email', { to, subject, html }, preview);

  if (!confirmed) {
    return { success: false, cancelled: true, error: 'User cancelled or timeout' };
  }

  // Import and use email sender
  const nodemailer = await import('nodemailer');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Flutur" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ''),
    });

    // Notify success via Telegram
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: USER_ID,
        text: `✅ Email inviata!\n\n📧 A: ${to}\n📝 Oggetto: ${subject}\n🆔 ${info.messageId}`,
      }),
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Post tweet with Telegram confirmation
 */
export async function postTweetWithConfirmation(
  text: string
): Promise<{ success: boolean; url?: string; error?: string; cancelled?: boolean }> {
  const confirmed = await requestConfirmation('tweet', { text }, text);

  if (!confirmed) {
    return { success: false, cancelled: true, error: 'User cancelled or timeout' };
  }

  // Import Twitter client
  const { TwitterApi } = await import('twitter-api-v2');

  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  });

  try {
    const result = await client.v2.tweet(text);
    const url = `https://twitter.com/i/status/${result.data.id}`;

    // Notify success via Telegram
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: USER_ID,
        text: `✅ Tweet pubblicato!\n\n"${text.substring(0, 100)}..."\n\n🔗 ${url}`,
      }),
    });

    return { success: true, url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Post to Instagram with Telegram confirmation
 */
export async function postInstagramWithConfirmation(
  caption: string,
  mediaUrls: string[],
  options?: {
    postType?: 'feed' | 'reels' | 'stories';
    hashtags?: string[];
    coverUrl?: string;
    shareToFeed?: boolean;
  }
): Promise<{ success: boolean; url?: string; postId?: string; error?: string; cancelled?: boolean }> {
  const postType = options?.postType || 'feed';
  const confirmed = await requestConfirmation('instagram', { caption, mediaUrls, postType, ...options }, caption);

  if (!confirmed) {
    return { success: false, cancelled: true, error: 'User cancelled or timeout' };
  }

  // Import Instagram client
  const { InstagramClient } = await import('./clients/instagram.js');

  const client = new InstagramClient({
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN!,
    businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!,
    facebookPageId: process.env.FACEBOOK_PAGE_ID || '',
  });

  if (!client.isConfigured()) {
    return { success: false, error: 'Instagram not configured' };
  }

  try {
    let result;

    if (postType === 'reels') {
      result = await client.postReel(mediaUrls[0], caption, {
        hashtags: options?.hashtags,
        coverUrl: options?.coverUrl,
        shareToFeed: options?.shareToFeed ?? true,
      });
    } else if (postType === 'stories') {
      result = await client.postStory(mediaUrls[0], caption);
    } else {
      result = await client.post({
        text: caption,
        caption,
        mediaUrls,
        hashtags: options?.hashtags,
        postType: 'feed',
      });
    }

    if (result.success) {
      // Notify success via Telegram
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: USER_ID,
          text: `✅ Instagram ${postType} pubblicato!\n\n"${caption.substring(0, 100)}..."\n\n🔗 ${result.url || result.postId}`,
        }),
      });
    }

    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// CLI test
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args[0] === 'test-email') {
    const to = args[1] || 'alessio.cazzaniga87@gmail.com';
    sendEmailWithConfirmation(to, 'Test Security Gate', '<p>This is a test email from the security gate.</p>')
      .then(result => {
        console.log('Result:', result);
        process.exit(result.success ? 0 : 1);
      });
  } else if (args[0] === 'test-tweet') {
    const text = args.slice(1).join(' ') || 'Test tweet from security gate';
    postTweetWithConfirmation(text)
      .then(result => {
        console.log('Result:', result);
        process.exit(result.success ? 0 : 1);
      });
  } else if (args[0] === 'test-instagram') {
    const mediaUrl = args[1];
    const caption = args.slice(2).join(' ') || 'Test Instagram post';
    if (!mediaUrl) {
      console.log('Usage: npx tsx src/security-gate.ts test-instagram <media-url> [caption]');
      process.exit(1);
    }
    postInstagramWithConfirmation(caption, [mediaUrl])
      .then(result => {
        console.log('Result:', result);
        process.exit(result.success ? 0 : 1);
      });
  } else if (args[0] === 'test-reel') {
    const videoUrl = args[1];
    const caption = args.slice(2).join(' ') || 'Test Instagram Reel';
    if (!videoUrl) {
      console.log('Usage: npx tsx src/security-gate.ts test-reel <video-url> [caption]');
      process.exit(1);
    }
    postInstagramWithConfirmation(caption, [videoUrl], { postType: 'reels' })
      .then(result => {
        console.log('Result:', result);
        process.exit(result.success ? 0 : 1);
      });
  } else {
    console.log(`
Security Gate - CLI Test

Usage:
  npx tsx src/security-gate.ts test-email [email]
  npx tsx src/security-gate.ts test-tweet [text]
  npx tsx src/security-gate.ts test-instagram <media-url> [caption]
  npx tsx src/security-gate.ts test-reel <video-url> [caption]

Examples:
  npx tsx src/security-gate.ts test-email alessio@example.com
  npx tsx src/security-gate.ts test-tweet "Hello world!"
  npx tsx src/security-gate.ts test-instagram "https://example.com/image.jpg" "My photo"
  npx tsx src/security-gate.ts test-reel "https://example.com/video.mp4" "My Reel"
    `);
  }
}
