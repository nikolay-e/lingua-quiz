import { type LevelKey, LEVEL_KEYS, createEmptyLevelArrays } from '@lingua-quiz/domain';
import type { ProgressEntry } from './types';

export type LevelStatus = LevelKey;

export type Queues = Record<LevelKey, string[]>;

export class QueueManager {
  private queues: Queues;
  private static readonly MAX_QUEUE_POSITION = 10000;

  constructor(translations: Array<{ id: string }>, initialProgress: ProgressEntry[]) {
    this.queues = createEmptyLevelArrays();

    const progressMap = new Map(initialProgress.map((p) => [p.translationId, p]));
    const levelGroups: Map<LevelStatus, Array<{ id: string; queuePosition: number }>> = new Map();
    LEVEL_KEYS.forEach((level) => levelGroups.set(level, []));

    translations.forEach((t, index) => {
      const progress = progressMap.get(t.id);
      const level = progress?.level ?? 'LEVEL_0';
      const queuePosition = progress?.queuePosition ?? index;
      const group = levelGroups.get(level);
      if (group !== undefined) {
        group.push({ id: t.id, queuePosition });
      }
    });

    LEVEL_KEYS.forEach((level) => {
      const group = levelGroups.get(level);
      if (group !== undefined) {
        group.sort((a, b) => a.queuePosition - b.queuePosition);
        this.queues[level] = group.map((item) => item.id);
      }
    });
  }

  pickFromQueue(level: LevelStatus, windowSize = 3): string | null {
    const queue = this.queues[level];
    if (queue.length === 0) return null;
    const maxIndex = Math.min(windowSize, queue.length);
    const randomIndex = Math.floor(Math.random() * maxIndex);
    return queue[randomIndex] ?? null;
  }

  removeFromQueue(level: LevelStatus, translationId: string): void {
    const queue = this.queues[level];
    const index = queue.indexOf(translationId);
    if (index > -1) {
      queue.splice(index, 1);
    }
  }

  insertIntoQueue(level: LevelStatus, translationId: string, position: number): number {
    const queue = this.queues[level];
    const insertIndex = Math.min(position, queue.length);
    queue.splice(insertIndex, 0, translationId);
    return position;
  }

  moveWordToLevel(translationId: string, oldLevel: LevelStatus, newLevel: LevelStatus): number {
    this.removeFromQueue(oldLevel, translationId);
    const newQueue = this.queues[newLevel];
    newQueue.push(translationId);
    return newQueue.length - 1;
  }

  updatePosition(
    translationId: string,
    level: LevelStatus,
    isCorrect: boolean,
    consecutiveCorrect: number,
    focusLoopSize: number,
    positionIncrement: number,
  ): number {
    this.removeFromQueue(level, translationId);
    const uncappedPosition = isCorrect ? positionIncrement * consecutiveCorrect : focusLoopSize;
    const newPosition = Math.min(uncappedPosition, QueueManager.MAX_QUEUE_POSITION);
    return this.insertIntoQueue(level, translationId, newPosition);
  }

  replenishFocusPool(maxFocusWords: number): string[] {
    const level1Count = this.queues.LEVEL_1.length;
    const needed = maxFocusWords - level1Count;
    if (needed <= 0) return [];

    const wordsToPromote = this.queues.LEVEL_0.slice(0, needed);
    for (const translationId of wordsToPromote) {
      this.moveWordToLevel(translationId, 'LEVEL_0', 'LEVEL_1');
    }
    return wordsToPromote;
  }

  getQueueLength(level: LevelStatus): number {
    return this.queues[level].length;
  }

  getQueues(): Queues {
    return this.queues;
  }

  getWordsByLevel(): Record<LevelStatus, string[]> {
    return Object.fromEntries(LEVEL_KEYS.map((level) => [level, [...this.queues[level]]])) as Record<
      LevelStatus,
      string[]
    >;
  }
}
