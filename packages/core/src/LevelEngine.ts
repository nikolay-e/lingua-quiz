import type { QueueManager, LevelStatus } from './QueueManager';
import type { ProgressEntry } from './types';

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
    switch (level) {
      case 'LEVEL_1':
        return this.queueManager.getQueueLength('LEVEL_0') > 0 || this.queueManager.getQueueLength('LEVEL_1') > 0;
      case 'LEVEL_2':
        return this.queueManager.getQueueLength('LEVEL_2') > 0;
      case 'LEVEL_3':
        return (
          this.queueManager.getQueueLength('LEVEL_3') > 0 ||
          this.queueManager.getQueueLength('LEVEL_4') > 0 ||
          this.queueManager.getQueueLength('LEVEL_5') > 0
        );
      case 'LEVEL_4':
        return (
          this.queueManager.getQueueLength('LEVEL_3') > 0 ||
          this.queueManager.getQueueLength('LEVEL_4') > 0 ||
          this.queueManager.getQueueLength('LEVEL_5') > 0
        );
      default:
        return false;
    }
  }

  getLowestAvailablePracticeLevel(): PracticeLevel {
    if (this.hasWordsForLevel('LEVEL_1')) return 'LEVEL_1';
    if (this.hasWordsForLevel('LEVEL_2')) return 'LEVEL_2';
    if (this.hasWordsForLevel('LEVEL_3')) return 'LEVEL_3';
    if (this.hasWordsForLevel('LEVEL_4')) return 'LEVEL_4';
    return 'LEVEL_1';
  }

  pickCandidateForLevel(level: PracticeLevel): string | null {
    switch (level) {
      case 'LEVEL_1':
        if (this.queueManager.getQueueLength('LEVEL_1') > 0) {
          return this.queueManager.pickFromQueue('LEVEL_1');
        }
        if (this.queueManager.getQueueLength('LEVEL_0') > 0) {
          return this.queueManager.pickFromQueue('LEVEL_0');
        }
        return null;
      case 'LEVEL_2':
        return this.queueManager.pickFromQueue('LEVEL_2');
      case 'LEVEL_3':
      case 'LEVEL_4':
        if (this.queueManager.getQueueLength('LEVEL_3') > 0) {
          return this.queueManager.pickFromQueue('LEVEL_3');
        }
        if (this.queueManager.getQueueLength('LEVEL_4') > 0) {
          return this.queueManager.pickFromQueue('LEVEL_4');
        }
        if (this.queueManager.getQueueLength('LEVEL_5') > 0) {
          return this.queueManager.pickFromQueue('LEVEL_5');
        }
        return null;
    }
  }

  checkLevelProgression(
    progress: ProgressEntry,
    correctAnswersToLevelUp: number,
    mistakesToLevelDown: number,
    minHistoryForDegradation: number,
  ): LevelStatus | null {
    if (progress.consecutiveCorrect >= correctAnswersToLevelUp) {
      return this.getNextLevel(progress.level);
    }

    const recentMistakes = progress.recentHistory.filter((h) => h === false).length;
    if (recentMistakes >= mistakesToLevelDown && progress.recentHistory.length >= minHistoryForDegradation) {
      return this.getPreviousLevel(progress.level);
    }

    return null;
  }

  getNextLevel(currentLevel: LevelStatus): LevelStatus | null {
    const levelMap: Record<LevelStatus, LevelStatus> = {
      LEVEL_0: 'LEVEL_1',
      LEVEL_1: 'LEVEL_2',
      LEVEL_2: 'LEVEL_3',
      LEVEL_3: 'LEVEL_4',
      LEVEL_4: 'LEVEL_5',
      LEVEL_5: 'LEVEL_5',
    };
    return levelMap[currentLevel] === currentLevel ? null : levelMap[currentLevel];
  }

  getPreviousLevel(currentLevel: LevelStatus): LevelStatus | null {
    const levelMap: Record<LevelStatus, LevelStatus> = {
      LEVEL_5: 'LEVEL_4',
      LEVEL_4: 'LEVEL_3',
      LEVEL_3: 'LEVEL_2',
      LEVEL_2: 'LEVEL_1',
      LEVEL_1: 'LEVEL_0',
      LEVEL_0: 'LEVEL_0',
    };
    return levelMap[currentLevel] === currentLevel ? null : levelMap[currentLevel];
  }
}
