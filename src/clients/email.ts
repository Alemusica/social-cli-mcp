/**
 * Email Client
 * Uses Gmail SMTP for sending emails
 *
 * Setup:
 * 1. Enable 2FA on Gmail
 * 2. Create App Password: Google Account > Security > App Passwords
 * 3. Add to .env: GMAIL_USER and GMAIL_APP_PASSWORD
 */

import * as nodemailer from 'nodemailer';
import type { Config } from '../types.js';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailClient {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string = '';

  constructor(config?: { user: string; appPassword: string }) {
    if (config?.user && config?.appPassword) {
      this.fromEmail = config.user;
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.user,
          pass: config.appPassword,
        },
      });
    }
  }

  isConfigured(): boolean {
    return !!this.transporter;
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      console.log(`Email connected as ${this.fromEmail}`);
      return true;
    } catch (error) {
      console.error('Email connection failed:', error);
      return false;
    }
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    if (!this.transporter) {
      return {
        success: false,
        error: 'Email client not configured',
      };
    }

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc?.join(', '),
        bcc: options.bcc?.join(', '),
        replyTo: options.replyTo,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  /**
   * Send outreach email with template
   */
  async sendOutreach(
    to: string,
    template: 'podcast' | 'collaboration' | 'introduction',
    variables: Record<string, string>
  ): Promise<EmailResult> {
    const templates = {
      podcast: {
        subject: `Podcast Guest Pitch: ${variables.angle || 'Unique Story to Share'}`,
        html: `
          <p>Hi ${variables.name || 'there'},</p>

          <p>${variables.opening || 'I discovered your podcast and thought my story might resonate with your audience.'}</p>

          <p><strong>Quick intro:</strong></p>
          <ul>
            <li>🎵 <strong>Flutur</strong> - Multi-instrumentalist (RAV Vast + live looping), Greece's Got Talent</li>
            <li>💻 <strong>jsOM</strong> - AI tool giving UI designers their place in the LLM era</li>
          </ul>

          <p>I call it the "M-shaped mind" - deep expertise in music + code, connected by creativity.</p>

          <p>${variables.customMessage || ''}</p>

          <p>Would love to share this perspective. Happy to chat first!</p>

          <p>Best,<br>Alessio</p>

          <p style="color: #666; font-size: 12px;">
            Links:
            <a href="https://instagram.com/flutur_8">Music</a> |
            <a href="https://github.com/AlessioIan/jsom">jsOM</a>
          </p>
        `,
      },
      collaboration: {
        subject: `Collaboration Opportunity: ${variables.topic || 'Creative Partnership'}`,
        html: `
          <p>Hi ${variables.name || 'there'},</p>

          <p>${variables.opening || 'I love your work and see potential for an exciting collaboration.'}</p>

          <p>${variables.pitch || ''}</p>

          <p>Let me know if you'd be interested in exploring this!</p>

          <p>Best,<br>Alessio</p>
        `,
      },
      introduction: {
        subject: variables.subject || 'Quick Introduction',
        html: `
          <p>Hi ${variables.name || 'there'},</p>

          <p>${variables.message || ''}</p>

          <p>Best,<br>Alessio</p>
        `,
      },
    };

    const template_ = templates[template];

    return this.send({
      to,
      subject: template_.subject,
      html: template_.html,
    });
  }
}

/**
 * Load email client from environment
 */
export function loadEmailClient(): EmailClient {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;

  if (user && appPassword) {
    return new EmailClient({ user, appPassword });
  }

  return new EmailClient();
}
