import type { LevelStatus } from './QueueManager';

export const F = 5;
export const K = 2;
export const T_PROMO = 3;
export const MISTAKE_THRESHOLD = 3;
export const MISTAKE_WINDOW = 10;
export const MAX_FOCUS_POOL_SIZE = K * F * T_PROMO;
export const MIN_HISTORY_FOR_DEGRADATION = 3;

export const LEVEL_ORDER: LevelStatus[] = ['LEVEL_0', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5'];

export function getNextLevel(level: LevelStatus): LevelStatus | null {
  const idx = LEVEL_ORDER.indexOf(level);
  if (idx === -1 || idx === LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[idx + 1] ?? null;
}

export function getPreviousLevel(level: LevelStatus): LevelStatus | null {
  const idx = LEVEL_ORDER.indexOf(level);
  if (idx <= 0) return null;
  return LEVEL_ORDER[idx - 1] ?? null;
}

export const LEVEL_QUEUE_MAP: Record<number, LevelStatus[]> = {
  1: ['LEVEL_1', 'LEVEL_0'],
  2: ['LEVEL_2'],
  3: ['LEVEL_3', 'LEVEL_4', 'LEVEL_5'],
  4: ['LEVEL_3', 'LEVEL_4', 'LEVEL_5'],
};
