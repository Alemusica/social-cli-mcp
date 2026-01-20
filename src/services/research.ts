/**
 * Research Service
 * Handles market research, competitor analysis, and trend tracking
 * for both Music and Software verticals
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { MarketResearch, Vertical, Platform } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Default competitor lists for each vertical
const DEFAULT_COMPETITORS = {
  music: {
    twitter: ['@RAVVast', '@handpanworld', '@loopstation', '@rcmusic'],
    instagram: ['@ravvastdrum', '@handpan_world', '@loopersunite'],
    tiktok: ['@ravvast', '@handpanmusic', '@livelooping'],
    youtube: ['@RAVVast', '@LoopStationArtists'],
  },
  software: {
    twitter: ['@anthropikiI', '@OpenAI', '@levelsio', '@mengto', '@figma'],
    instagram: ['@figma', '@designsystems'],
    youtube: ['@Fireship', '@ThePrimeagen'],
    linkedin: [],
  },
};

// Trending hashtags by vertical (to be updated via research)
const TRENDING_HASHTAGS = {
  music: {
    primary: ['#RAVVast', '#handpan', '#livelooping', '#musician', '#musicproducer'],
    secondary: ['#instrumentalist', '#percussion', '#ambient', '#soundhealing', '#streetmusician'],
    platforms: {
      instagram: ['#reelsmusic', '#musicianlife', '#instrumentcover'],
      tiktok: ['#musictok', '#fyp', '#viral', '#livemusic'],
      youtube: ['#shorts', '#music', '#liveperformance'],
    },
  },
  software: {
    primary: ['#AI', '#LLM', '#buildinpublic', '#webdev', '#devtools'],
    secondary: ['#programming', '#coding', '#opensource', '#startup', '#indiehacker'],
    platforms: {
      twitter: ['#TechTwitter', '#DevRel', '#AItools'],
      linkedin: ['#artificialintelligence', '#softwareengineering', '#techinnovation'],
    },
  },
};

export class ResearchService {
  private researchDir: string;
  private vertical: Vertical;

  constructor(vertical: Vertical) {
    this.vertical = vertical;
    this.researchDir = path.join(PROJECT_ROOT, 'research', vertical);
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(this.researchDir)) {
      fs.mkdirSync(this.researchDir, { recursive: true });
    }
  }

  /**
   * Get recommended hashtags for a platform
   */
  getHashtags(platform: Platform): { primary: string[]; secondary: string[]; platform: string[] } {
    const verticalTags = TRENDING_HASHTAGS[this.vertical];
    const platformTags = verticalTags.platforms[platform as keyof typeof verticalTags.platforms] || [];

    return {
      primary: verticalTags.primary,
      secondary: verticalTags.secondary,
      platform: platformTags,
    };
  }

  /**
   * Get competitor accounts for a platform
   */
  getCompetitors(platform: Platform): string[] {
    const competitors = DEFAULT_COMPETITORS[this.vertical] as Record<string, string[]>;
    return competitors[platform] || [];
  }

  /**
   * Save market research report
   */
  async saveResearch(research: MarketResearch): Promise<void> {
    const fileName = `research-${research.date.toISOString().split('T')[0]}.json`;
    const filePath = path.join(this.researchDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(research, null, 2));
  }

  /**
   * Get latest research report
   */
  async getLatestResearch(): Promise<MarketResearch | null> {
    const files = fs.readdirSync(this.researchDir)
      .filter(f => f.startsWith('research-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const filePath = path.join(this.researchDir, files[0]);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  /**
   * Get all research reports
   */
  async getAllResearch(): Promise<MarketResearch[]> {
    const files = fs.readdirSync(this.researchDir)
      .filter(f => f.startsWith('research-') && f.endsWith('.json'))
      .sort()
      .reverse();

    return files.map(f => {
      const filePath = path.join(this.researchDir, f);
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    });
  }

  /**
   * Generate content ideas based on research
   */
  generateContentIdeas(count: number = 5): string[] {
    const ideas: string[] = [];

    if (this.vertical === 'music') {
      ideas.push(
        'Behind-the-scenes RAV Vast practice session (Reel/TikTok)',
        'Live looping breakdown - how I layer sounds (YouTube Short)',
        'Street performance highlight reel (Instagram Reel)',
        'Q&A about my instruments and setup (Story)',
        'Cover of trending song with RAV Vast (TikTok)',
        'Day in the life of a multi-instrumentalist (Vlog)',
        'Tutorial: Basic RAV Vast rhythms for beginners',
        'Collaboration with another musician (Cross-post)',
        'Equipment tour and sound comparison',
        'Reaction to fans playing my songs',
      );
    } else {
      ideas.push(
        'jsOM demo: Design to code in 60 seconds (Twitter thread)',
        'Why designers should embrace AI tools (LinkedIn)',
        'Building in public: Weekly progress update',
        'Technical deep-dive: How jsOM parses Figma files',
        'Designer testimonial/case study',
        'AI pair programming session (YouTube)',
        'Hot take on the future of design-to-code',
        'Tutorial: Getting started with jsOM',
        'Comparison: Traditional vs AI-assisted workflow',
        'AMA about building dev tools',
      );
    }

    return ideas.slice(0, count);
  }

  /**
   * Get best posting times for a platform
   */
  getBestPostingTimes(platform: Platform): string[] {
    // Based on general research + music/software audience patterns
    const times: Record<Platform, string[]> = {
      twitter: ['09:00', '12:00', '17:00', '21:00'],
      instagram: ['11:00', '14:00', '19:00'],
      tiktok: ['07:00', '12:00', '19:00', '22:00'],
      youtube: ['14:00', '16:00', '20:00'],
      linkedin: ['08:00', '12:00', '17:00'],
      reddit: ['10:00', '20:00'],
    };

    return times[platform] || ['12:00', '18:00'];
  }

  /**
   * Get content pillars for the vertical
   */
  getContentPillars(): string[] {
    if (this.vertical === 'music') {
      return [
        'Performance & Live Shows',
        'Behind the Scenes',
        'Tutorials & Education',
        'Personal Story & Journey',
        'Collaborations',
        'Fan Engagement',
      ];
    } else {
      return [
        'Product Updates & Features',
        'Technical Deep-dives',
        'Industry Commentary',
        'User Stories & Case Studies',
        'Building in Public',
        'Educational Content',
      ];
    }
  }

  /**
   * Analyze posting frequency recommendations
   */
  getPostingFrequency(): Record<Platform, { postsPerWeek: number; type: string }> {
    if (this.vertical === 'music') {
      return {
        twitter: { postsPerWeek: 7, type: 'Daily updates, engagement, reposts' },
        instagram: { postsPerWeek: 5, type: '3 Reels, 1 Carousel, Daily Stories' },
        tiktok: { postsPerWeek: 7, type: 'Daily short videos, trending sounds' },
        youtube: { postsPerWeek: 2, type: '1 Long-form, 3-4 Shorts' },
        linkedin: { postsPerWeek: 0, type: 'Not primary for music' },
        reddit: { postsPerWeek: 1, type: 'Community engagement only' },
      };
    } else {
      return {
        twitter: { postsPerWeek: 14, type: 'Multiple daily, threads, engagement' },
        instagram: { postsPerWeek: 2, type: 'Visual demos, Stories for updates' },
        tiktok: { postsPerWeek: 3, type: 'Quick demos, tech humor' },
        youtube: { postsPerWeek: 1, type: 'Tutorials, deep-dives' },
        linkedin: { postsPerWeek: 3, type: 'Professional updates, thought leadership' },
        reddit: { postsPerWeek: 2, type: 'Community help, launches' },
      };
    }
  }
}

/**
 * Get research service for a specific vertical
 */
export function getResearchService(vertical: Vertical): ResearchService {
  return new ResearchService(vertical);
}
