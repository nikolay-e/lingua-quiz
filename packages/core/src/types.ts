/**
 * Core type definitions for the LinguaQuiz business logic
 * These types are independent of any specific UI or API implementation
 */
export interface Translation {
  id: string;
  sourceText: string;
  sourceLanguage: string;
  sourceUsageExample?: string;
  targetText: string;
  targetLanguage: string;
  targetUsageExample?: string;
}

export interface ProgressEntry {
  translationId: string;
  level: 'LEVEL_0' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5';
  queuePosition?: number;
  consecutiveCorrect: number;
  recentHistory: boolean[];
  lastAskedAt?: string;
}
