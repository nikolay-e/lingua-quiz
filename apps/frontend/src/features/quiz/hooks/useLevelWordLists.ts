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
    const pronunciationPassedIds = quizManager.getWordsPronunciationPassed();

    return LEVEL_CONFIG.reduce<LevelWordLists>((acc, level) => {
      if (level.key === 'PRONUNCIATION') {
        const words = pronunciationPassedIds
          .map((id) => quizManager.getTranslationForDisplay(id))
          .filter((translation): translation is TranslationDisplay => translation !== undefined)
          .map((w) => `${w.source} -> ${w.target}`);

        acc[level.id] = { ...level, words, count: pronunciationPassedIds.length };
        return acc;
      }

      const queue = state.queues[level.key];
      const words = queue
        .map((id) => quizManager.getTranslationForDisplay(id))
        .filter((translation): translation is TranslationDisplay => translation !== undefined)
        .map((w) => `${w.source} -> ${w.target}`);

      acc[level.id] = { ...level, words, count: queue.length };
      return acc;
    }, {});
  }, [quizManager]);
}
