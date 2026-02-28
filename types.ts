
export interface WordBreakdown {
  word: string;
  phonetic: string;
  meaning: string;
  role: string;
}

export interface TrainingItem {
  point: string;
  meaning: string;
  phonetic: string;
  role: string;
  audioUrl?: string;
}

export interface Card {
  id: string;
  text: string;
  translation: string;
  audioUrl: string; // Base64 or URL
  breakdown: WordBreakdown[];
  trainingContent?: TrainingItem[]; // 新增：训练模式内容
  context: string;
  grammarNote: string;
  voiceName?: string; // 朗读者姓名
  audioDuration?: number; // 音频时长（秒）
  repeatCount: number; // 复读次数 (3-5)
  isForReview?: boolean; // 新增：是否加入复习计划
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
  updatedAt?: number; // 更新时间
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
export type AIProvider = 'google' | 'deepseek';
export type VoiceProvider = 'google' | 'doubao';
export type AIModel = 
  | 'gemini-3-flash-preview' 
  | 'gemini-3-pro-preview' 
  | 'deepseek-chat' 
  | 'deepseek-reasoner';

export enum AppSection {
  LIBRARY = 'library',
  LEARNING = 'learning',
  TRAINING = 'training',
  STATISTICS = 'statistics',
  SETTINGS = 'settings',
  STORE = 'store',
  CREATE = 'create',
  EDIT = 'edit',
  PROFILE = 'profile'
}

export interface TrainingChallenge {
  id: string;
  type: 'word' | 'phrase' | 'sentence';
  content: string;
  audioUrl: string;
  translation?: string;
  voiceName?: string;
}

export interface TrainingSession {
  deckId: string;
  challenges: TrainingChallenge[];
  currentIndex: number;
}

export enum Modality {
  AUDIO = 'AUDIO',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE'
}
