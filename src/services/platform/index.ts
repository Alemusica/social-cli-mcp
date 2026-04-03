/**
 * Platform Clients — Barrel Export
 *
 * Pure API clients with no DB dependencies.
 * All database writes happen in the calling service layer.
 */

export { TwitterClient } from './twitter.js';
export { InstagramClient } from './instagram.js';
export { YouTubeClient } from './youtube.js';
export {
  GmailSender,
  loadGmailSender,
  gmailClient,
  // Core API functions
  listMessages,
  getMessage,
  getThread,
  findThreadByMessageId,
  scanOutreachReplies,
  scanSentEmails,
  classifyReply,
} from './gmail.js';
export type {
  GmailMessage,
  GmailThread,
  ThreadContext,
  InboxScanResult,
  SentScanResult,
  EmailOptions,
  EmailResult,
} from './gmail.js';
