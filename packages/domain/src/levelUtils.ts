import { LEVEL_KEYS, type LevelKey } from './levels';

export function createLevelRecord<T>(initialValue: T | (() => T)): Record<LevelKey, T> {
  const getValue = typeof initialValue === 'function' ? (initialValue as () => T) : () => initialValue;

  return Object.fromEntries(LEVEL_KEYS.map((level) => [level, getValue()])) as Record<LevelKey, T>;
}

export function createEmptyLevelArrays(): Record<LevelKey, string[]> {
  return createLevelRecord(() => [] as string[]);
}

export function createZeroLevelCounts(): Record<LevelKey, number> {
  return createLevelRecord(0);
}
