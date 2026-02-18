
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
  voiceName?: string; // 朗读者姓名
  audioDuration?: number; // 音频时长（秒）
  repeatCount: number; // 新增：复读次数 (3-5)
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  icon: string;
  sourceText?: string; // 保存原始素材文本
  cards: Card[];
  isSubscribed?: boolean;
  author?: string;
  createdBy?: string; // User ID of the creator
  createdAt: number;
  updatedAt?: number; // 新增：更新时间
  tags?: string[];
  originDeckId?: string; // Tracks the library ID this store listing came from
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: number; // 1: Admin, 2: VIP, others/null: Regular
  dailyGoal?: number;
  streak?: number;
}

export type Language = 'en' | 'zh';
export type AIModel = 'gemini-3-flash-preview' | 'gemini-3-pro-preview';

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
