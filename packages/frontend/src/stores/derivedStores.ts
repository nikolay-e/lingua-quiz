import { derived } from 'svelte/store';
import { quizStore } from './quizStore';
import type { LevelWordLists, TranslationDisplay } from '../api-types';
import { LEVEL_CONFIG } from '../lib/config/levelConfig';

export const levelWordLists = derived(
  quizStore,
  ($quizStore, set) => {
    if ($quizStore.quizManager === null) {
      const emptyLevelWordLists = LEVEL_CONFIG.reduce((acc, level) => {
        acc[level.id] = { ...level, words: [], count: 0 };
        return acc;
      }, {} as LevelWordLists);
      set(emptyLevelWordLists);
      return;
    }

    const state = $quizStore.quizManager.getState();
    const manager = $quizStore.quizManager;

    const newLevelWordLists = LEVEL_CONFIG.reduce((acc, level) => {
      const queue = state.queues[level.key as keyof typeof state.queues];
      const words = queue
        .map((id) => manager.getTranslationForDisplay(id))
        .filter((translation): translation is TranslationDisplay => translation !== undefined)
        .map((w) => `${w.source} -> ${w.target}`);

      const queueLength = queue.length;

      acc[level.id] = {
        ...level,
        words,
        count: queueLength,
      };
      return acc;
    }, {} as LevelWordLists);

    set(newLevelWordLists);
  },
  {} as LevelWordLists,
);
