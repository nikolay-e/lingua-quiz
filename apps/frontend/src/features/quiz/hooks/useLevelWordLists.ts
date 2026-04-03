import { useMemo } from 'react';
import type { QuizManager } from '@lingua-quiz/core';
import type { LevelWordLists, TranslationDisplay } from '@api/types';
import { LEVEL_CONFIG } from '../config/levelConfig';

export function useLevelWordLists(quizManager: QuizManager | null): LevelWordLists {
  return useMemo(() => {
    if (quizManager === null) {
      return LEVEL_CONFIG.reduce<LevelWordLists>((acc, level) => {
        acc[level.id] = { ...level, words: [], count: 0 };
        return acc;
      }, {});
    }

    const state = quizManager.getState();
    const pendingPronunciationIds = new Set(quizManager.getWordsPendingPronunciation());

    return LEVEL_CONFIG.reduce<LevelWordLists>((acc, level) => {
      if (level.key === 'PRONUNCIATION') {
        const words = Array.from(pendingPronunciationIds)
          .map((id) => quizManager.getTranslationForDisplay(id))
          .filter((translation): translation is TranslationDisplay => translation !== undefined)
          .map((w) => `${w.source} -> ${w.target}`);

        acc[level.id] = { ...level, words, count: words.length };
        return acc;
      }

      const queue = state.queues[level.key as keyof typeof state.queues];

      if (level.key === 'LEVEL_5') {
        const fullyMasteredIds = queue.filter((id) => !pendingPronunciationIds.has(id));
        const words = fullyMasteredIds
          .map((id) => quizManager.getTranslationForDisplay(id))
          .filter((translation): translation is TranslationDisplay => translation !== undefined)
          .map((w) => `${w.source} -> ${w.target}`);

        acc[level.id] = { ...level, words, count: fullyMasteredIds.length };
        return acc;
      }

      const words = queue
        .map((id) => quizManager.getTranslationForDisplay(id))
        .filter((translation): translation is TranslationDisplay => translation !== undefined)
        .map((w) => `${w.source} -> ${w.target}`);

      acc[level.id] = { ...level, words, count: queue.length };
      return acc;
    }, {});
  }, [quizManager]);
}
