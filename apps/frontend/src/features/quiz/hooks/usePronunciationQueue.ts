import { useState, useCallback, useMemo } from 'react';
import type { QuizManager, Translation } from '@lingua-quiz/core';

interface PronunciationQueue {
  currentWord: Translation | null;
  pendingCount: number;
  advance: () => void;
}

export function usePronunciationQueue(quizManager: QuizManager | null): PronunciationQueue {
  const [currentIndex, setCurrentIndex] = useState(0);

  const pendingIds = useMemo(() => {
    if (quizManager === null) return [];
    return quizManager.getWordsPendingPronunciation();
  }, [quizManager, currentIndex]);

  const currentWord = useMemo(() => {
    if (quizManager === null || pendingIds.length === 0) return null;
    const firstId = pendingIds[0];
    if (firstId === undefined) return null;
    return quizManager.getTranslation(firstId) ?? null;
  }, [quizManager, pendingIds]);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
  }, []);

  return { currentWord, pendingCount: pendingIds.length, advance };
}
