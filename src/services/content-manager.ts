/**
 * Content Manager Service
 * Handles editorial calendar, content scheduling, and publishing orchestration
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type {
  ContentItem,
  EditorialCalendar,
  ContentStrategy,
  Vertical,
  Platform,
  PostResult,
} from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

export class ContentManager {
  private contentDir: string;
  private vertical: Vertical;

  constructor(vertical: Vertical) {
    this.vertical = vertical;
    this.contentDir = path.join(PROJECT_ROOT, 'content', vertical);
  }

  /**
   * Get all content items for the vertical
   */
  async getAllContent(): Promise<ContentItem[]> {
    const items: ContentItem[] = [];
    // Map status to folder names
    const statusFolders: Record<string, string> = {
      draft: 'drafts',
      scheduled: 'scheduled',
      published: 'published',
    };

    for (const status of ['draft', 'scheduled', 'published'] as const) {
      const dir = path.join(this.contentDir, statusFolders[status]);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
          items.push(content);
        }
      }
    }

    return items;
  }

  /**
   * Create a new content item
   */
  async createContent(item: Omit<ContentItem, 'id' | 'status'>): Promise<ContentItem> {
    const id = `${this.vertical}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const contentItem: ContentItem = {
      ...item,
      id,
      status: 'draft',
      vertical: this.vertical,
    };

    const filePath = path.join(this.contentDir, 'drafts', `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(contentItem, null, 2));

    return contentItem;
  }

  /**
   * Update content item
   */
  async updateContent(id: string, updates: Partial<ContentItem>): Promise<ContentItem | null> {
    const item = await this.getContentById(id);
    if (!item) return null;

    const updated = { ...item, ...updates };

    // Move to new status folder if status changed
    if (updates.status && updates.status !== item.status) {
      const oldPath = this.getContentPath(id, item.status);
      const newPath = this.getContentPath(id, updates.status);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      fs.writeFileSync(newPath, JSON.stringify(updated, null, 2));
    } else {
      const filePath = this.getContentPath(id, item.status);
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    }

    return updated;
  }

  /**
   * Schedule content for publishing
   */
  async scheduleContent(id: string, scheduledAt: Date): Promise<ContentItem | null> {
    return this.updateContent(id, {
      status: 'scheduled',
      scheduledAt,
    });
  }

  /**
   * Get content ready for publishing
   */
  async getScheduledContent(): Promise<ContentItem[]> {
    const all = await this.getAllContent();
    const now = new Date();
    return all.filter(
      item => item.status === 'scheduled' && item.scheduledAt && new Date(item.scheduledAt) <= now
    );
  }

  /**
   * Mark content as published
   */
  async markPublished(id: string, results: PostResult[]): Promise<ContentItem | null> {
    return this.updateContent(id, {
      status: 'published',
      publishedAt: new Date(),
      results,
    });
  }

  /**
   * Get content by ID
   */
  async getContentById(id: string): Promise<ContentItem | null> {
    for (const status of ['draft', 'scheduled', 'published'] as const) {
      const filePath = this.getContentPath(id, status);
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    }
    return null;
  }

  /**
   * Get editorial calendar for a week
   */
  async getWeeklyCalendar(weekStart: Date): Promise<EditorialCalendar> {
    const all = await this.getAllContent();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const items = all.filter(item => {
      const date = item.scheduledAt ? new Date(item.scheduledAt) : item.publishedAt ? new Date(item.publishedAt) : null;
      return date && date >= weekStart && date < weekEnd;
    });

    return {
      vertical: this.vertical,
      weekStart,
      items,
    };
  }

  /**
   * Get content strategy
   */
  async getStrategy(): Promise<ContentStrategy | null> {
    const strategyPath = path.join(this.contentDir, 'strategy.json');
    if (fs.existsSync(strategyPath)) {
      return JSON.parse(fs.readFileSync(strategyPath, 'utf-8'));
    }
    return null;
  }

  /**
   * Save content strategy
   */
  async saveStrategy(strategy: ContentStrategy): Promise<void> {
    const strategyPath = path.join(this.contentDir, 'strategy.json');
    fs.writeFileSync(strategyPath, JSON.stringify(strategy, null, 2));
  }

  /**
   * Get next available posting slot based on strategy
   */
  async getNextPostingSlot(platform: Platform): Promise<Date | null> {
    const strategy = await this.getStrategy();
    if (!strategy) return null;

    const platformStrategy = strategy.postingFrequency.find(p => p.platform === platform);
    if (!platformStrategy) return null;

    const scheduled = await this.getAllContent();
    const scheduledDates = scheduled
      .filter(item => item.status === 'scheduled' && item.platforms.includes(platform))
      .map(item => new Date(item.scheduledAt!));

    // Find next available slot
    const now = new Date();
    for (let day = 0; day < 14; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);

      for (const time of platformStrategy.bestTimes) {
        const [hours, minutes] = time.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);

        if (date > now && !scheduledDates.some(d => d.getTime() === date.getTime())) {
          return date;
        }
      }
    }

    return null;
  }

  private getContentPath(id: string, status: ContentItem['status']): string {
    const folder = status === 'draft' ? 'drafts' : status;
    return path.join(this.contentDir, folder, `${id}.json`);
  }
}

/**
 * Get content manager for a specific vertical
 */
export function getContentManager(vertical: Vertical): ContentManager {
  return new ContentManager(vertical);
}
