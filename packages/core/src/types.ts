import type { LevelKey, VocabularyItem } from '@lingua-quiz/domain';

/**
 * Core type definitions for the LinguaQuiz business logic
 * These types are independent of any specific UI or API implementation
 */
export type Translation = VocabularyItem;

export interface ProgressEntry {
  translationId: string;
  level: LevelKey;
  queuePosition?: number;
  consecutiveCorrect: number;
  recentHistory: boolean[];
  lastAskedAt?: string;
}
