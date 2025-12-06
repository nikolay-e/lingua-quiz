import type { LevelKey, VocabularyItem } from '@lingua-quiz/domain';

export type Translation = VocabularyItem;

export interface ProgressEntry {
  translationId: string;
  level: LevelKey;
  queuePosition?: number;
  consecutiveCorrect: number;
  recentHistory: boolean[];
  lastAskedAt?: string;
}
