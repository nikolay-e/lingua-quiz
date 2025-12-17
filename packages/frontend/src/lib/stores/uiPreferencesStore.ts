import { writable } from 'svelte/store';
import { LEVEL_CONFIG } from '$lib/config/levelConfig';
import { STORAGE_KEYS } from '$lib/constants';
import { safeStorage } from '../utils/safeStorage';
import { logger } from '../utils/logger';

function createUIPreferencesStore() {
  const initialFoldedLists: Record<string, boolean> = {};
  LEVEL_CONFIG.forEach((level) => {
    initialFoldedLists[level.id] = true;
  });

  const savedFoldStates = safeStorage.getItem(STORAGE_KEYS.FOLDED_LISTS);
  if (savedFoldStates !== null) {
    try {
      const parsed: unknown = JSON.parse(savedFoldStates);
      if (typeof parsed === 'object' && parsed !== null) {
        const saved = parsed as Record<string, unknown>;
        Object.keys(initialFoldedLists).forEach((key) => {
          if (key in saved) {
            const value = saved[key];
            if (typeof value === 'boolean') {
              initialFoldedLists[key] = value;
            }
          }
        });
      }
    } catch (error) {
      logger.warn('Failed to parse UI preferences from localStorage', { error });
    }
  }

  const foldedLists = writable<Record<string, boolean>>(initialFoldedLists);

  return {
    foldedLists,
    toggleFold(levelId: string) {
      foldedLists.update((state) => {
        const newState = { ...state };
        newState[levelId] = newState[levelId] !== true;
        safeStorage.setItem(STORAGE_KEYS.FOLDED_LISTS, JSON.stringify(newState));
        return newState;
      });
    },
  };
}

export const uiPreferencesStore = createUIPreferencesStore();
