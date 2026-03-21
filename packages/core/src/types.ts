import type { LevelKey } from './levels';

export interface Translation {
  id: string;
  sourceText: string;
  sourceLanguage: string;
  targetText: string;
  targetLanguage: string;
  listName: string;
  difficultyLevel: string | null;
  sourceUsageExample: string | null;
  targetUsageExample: string | null;
}

export interface ProgressEntry {
  translationId: string;
  level: LevelKey;
  queuePosition?: number;
  consecutiveCorrect: number;
  recentHistory: boolean[];
  lastAskedAt?: string;
}
