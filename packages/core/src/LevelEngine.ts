import type { QueueManager, LevelStatus } from './QueueManager';
import type { ProgressEntry } from './types';
import { getNextLevel, getPreviousLevel, LEVEL_QUEUE_MAP } from './constants';

export type PracticeLevel = Extract<LevelStatus, 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4'>;
export type QuestionDirection = 'normal' | 'reverse';
export type QuestionType = 'translation' | 'usage';

export class LevelEngine {
  private queueManager: QueueManager;

  constructor(queueManager: QueueManager) {
    this.queueManager = queueManager;
  }

  getDirection(level: PracticeLevel): QuestionDirection {
    return level === 'LEVEL_1' || level === 'LEVEL_3' ? 'normal' : 'reverse';
  }

  getQuestionType(level: PracticeLevel): QuestionType {
    return level === 'LEVEL_3' || level === 'LEVEL_4' ? 'usage' : 'translation';
  }

  hasWordsForLevel(level: PracticeLevel): boolean {
    const levelNum = parseInt(level.replace('LEVEL_', ''));
    const queues = LEVEL_QUEUE_MAP[levelNum];
    if (!queues) return false;
    return queues.some((queue) => this.queueManager.getQueueLength(queue) > 0);
  }

  getLowestAvailablePracticeLevel(): PracticeLevel {
    if (this.hasWordsForLevel('LEVEL_1')) return 'LEVEL_1';
    if (this.hasWordsForLevel('LEVEL_2')) return 'LEVEL_2';
    if (this.hasWordsForLevel('LEVEL_3')) return 'LEVEL_3';
    if (this.hasWordsForLevel('LEVEL_4')) return 'LEVEL_4';
    return 'LEVEL_1';
  }

  pickCandidateForLevel(level: PracticeLevel): string | null {
    const levelNum = parseInt(level.replace('LEVEL_', ''));
    const queues = LEVEL_QUEUE_MAP[levelNum];
    if (!queues) return null;

    for (const queue of queues) {
      if (this.queueManager.getQueueLength(queue) > 0) {
        return this.queueManager.pickFromQueue(queue);
      }
    }
    return null;
  }

  checkLevelProgression(
    progress: ProgressEntry,
    correctAnswersToLevelUp: number,
    mistakesToLevelDown: number,
    minHistoryForDegradation: number,
  ): LevelStatus | null {
    if (progress.consecutiveCorrect >= correctAnswersToLevelUp) {
      return getNextLevel(progress.level);
    }

    const recentMistakes = progress.recentHistory.filter((h) => h === false).length;
    if (recentMistakes >= mistakesToLevelDown && progress.recentHistory.length >= minHistoryForDegradation) {
      return getPreviousLevel(progress.level);
    }

    return null;
  }
}
