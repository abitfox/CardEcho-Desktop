
export interface WordBreakdown {
  word: string;
  phonetic: string;
  meaning: string;
  role: string;
}

export interface Card {
  id: string;
  text: string;
  translation: string;
  audioUrl: string; // Base64 or URL
  breakdown: WordBreakdown[];
  context: string;
  grammarNote: string;
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  icon: string;
  cards: Card[];
  isSubscribed?: boolean;
  author?: string;
  createdBy?: string; // User ID of the creator
  createdAt: number;
  tags?: string[];
  originDeckId?: string; // New: Tracks the library ID this store listing came from
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: number; // 1: Admin, 2: VIP, others/null: Regular
}

export type Language = 'en' | 'zh';

export enum AppSection {
  LIBRARY = 'library',
  LEARNING = 'learning',
  STATISTICS = 'statistics',
  SETTINGS = 'settings',
  STORE = 'store',
  CREATE = 'create',
  EDIT = 'edit',
  PROFILE = 'profile'
}

export enum Modality {
  AUDIO = 'AUDIO',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE'
}
