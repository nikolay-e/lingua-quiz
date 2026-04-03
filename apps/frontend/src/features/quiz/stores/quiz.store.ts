import { create } from 'zustand';
import type { QuizManager, QuizQuestion, SubmissionResult, RevealResult } from '@lingua-quiz/core';
import type { WordList } from '@api/types';
import { logger, extractErrorMessage } from '@shared/utils';
import { quizService } from '../services/quiz-service';

interface QuizState {
  wordLists: WordList[];
  selectedQuiz: string | null;
  quizManager: QuizManager | null;
  currentQuestion: QuizQuestion | null;
  loading: boolean;
  error: string | null;
}

type ActiveLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4';

interface QuizActions {
  loadWordLists: (token: string) => Promise<void>;
  startQuiz: (token: string, quizName: string) => Promise<void>;
  getNextQuestion: () => QuizQuestion | null;
  submitAnswer: (token: string, answer: string) => Promise<SubmissionResult | null>;
  revealAnswer: (token: string) => RevealResult | null;
  setLevel: (
    level: ActiveLevel,
    token?: string,
  ) => Promise<{ success: boolean; actualLevel: ActiveLevel; message?: string }>;
  markPronunciationPassed: (token: string, translationId: string) => void;
  autoSetPronunciationForUnsupportedLanguage: (token: string) => void;
  reset: () => void;
  saveAndCleanup: (token: string) => Promise<void>;
  flushImmediately: (token: string, isUnloading?: boolean) => void;
  restorePending: (token: string) => Promise<void>;
  hasPendingChanges: () => boolean;
  setSaveErrorCallback: (callback: (message: string) => void) => void;
}

type QuizStore = QuizState & QuizActions;

export const useQuizStore = create<QuizStore>()((set, get) => ({
  wordLists: [],
  selectedQuiz: null,
  quizManager: null,
  currentQuestion: null,
  loading: false,
  error: null,

  loadWordLists: async (token: string) => {
    const { loading, wordLists } = get();
    if (loading || wordLists.length > 0) return;

    set({ loading: true, error: null });

    try {
      const result = await quizService.loadWordLists(token);
      if (result === null) {
        set({ loading: false, error: 'Failed to load word lists. Please try again.' });
        throw new Error('Failed to load word lists');
      } else {
        set({ wordLists: result, loading: false });
      }
    } catch (error: unknown) {
      const msg = extractErrorMessage(error, 'Failed to load word lists');
      if (get().loading) {
        set({ error: msg, loading: false });
      }
      throw error;
    }
  },

  startQuiz: async (token: string, quizName: string) => {
    set({ loading: true, error: null });

    try {
      const result = await quizService.startQuiz(token, quizName);
      if (result === null) {
        set({ loading: false, selectedQuiz: null, error: 'Failed to start quiz. Please try again.' });
        throw new Error('Failed to start quiz');
      } else {
        set({
          loading: false,
          selectedQuiz: quizName,
          quizManager: result.manager,
          currentQuestion: result.currentQuestion,
        });
      }
    } catch (error: unknown) {
      const msg = extractErrorMessage(error, 'Failed to start quiz');
      if (get().loading) {
        set({ error: msg, loading: false, selectedQuiz: null });
      }
      throw error;
    }
  },

  getNextQuestion: () => {
    const state = get();
    if (state.quizManager === null) return null;

    const questionResult = state.quizManager.getNextQuestion();
    const { question } = questionResult;

    set({ currentQuestion: question });
    return question;
  },

  submitAnswer: async (token: string, answer: string) => {
    const state = get();
    if (state.quizManager === null || state.currentQuestion === null) return null;

    try {
      const feedback = quizService.submitAnswer(state.quizManager, state.currentQuestion, answer, token);
      return feedback;
    } catch (error: unknown) {
      logger.error('Failed to submit answer:', error);
      throw error;
    }
  },

  revealAnswer: (token: string) => {
    const state = get();
    if (state.quizManager === null || state.currentQuestion === null) return null;

    return quizService.revealAnswer(state.quizManager, state.currentQuestion, token);
  },

  setLevel: async (level: ActiveLevel, token?: string) => {
    const state = get();
    if (state.quizManager === null) {
      return { success: false, actualLevel: 'LEVEL_1' as const, message: 'Quiz not initialized' };
    }

    const result = await quizService.setLevel(state.quizManager, level, token);
    const questionResult = state.quizManager.getNextQuestion();
    set({ currentQuestion: questionResult.question });

    return result;
  },

  markPronunciationPassed: (token: string, translationId: string) => {
    const state = get();
    if (state.quizManager === null) return;
    quizService.markPronunciationPassed(state.quizManager, translationId, token);
  },

  autoSetPronunciationForUnsupportedLanguage: (token: string) => {
    const state = get();
    if (state.quizManager === null) return;
    quizService.autoSetPronunciationForUnsupportedLanguage(state.quizManager, token);
  },

  reset: () => {
    const state = get();
    quizService.cleanup();
    set({
      wordLists: state.wordLists,
      selectedQuiz: null,
      quizManager: null,
      currentQuestion: null,
      loading: false,
      error: null,
    });
  },

  saveAndCleanup: async (token: string) => {
    const state = get();
    await quizService.saveAndCleanup(token, state.quizManager);
  },

  flushImmediately: (token: string, isUnloading = false) => {
    const state = get();
    quizService.flushImmediately(token, state.quizManager, isUnloading);
  },

  restorePending: async (token: string) => {
    await quizService.restorePendingFromStorage(token);
  },

  hasPendingChanges: () => {
    return quizService.hasPendingChanges();
  },

  setSaveErrorCallback: (callback: (message: string) => void) => {
    quizService.setSaveErrorCallback(callback);
  },
}));
