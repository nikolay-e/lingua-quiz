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
  sessionId: string | null;
  loading: boolean;
  error: string | null;
}

interface QuizActions {
  loadWordLists: (token: string) => Promise<void>;
  startQuiz: (token: string, quizName: string) => Promise<void>;
  getNextQuestion: () => QuizQuestion | null;
  submitAnswer: (token: string, answer: string) => Promise<SubmissionResult | null>;
  revealAnswer: () => RevealResult | null;
  setLevel: (
    level: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4',
    token?: string,
  ) => Promise<{ success: boolean; actualLevel: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4'; message?: string }>;
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
  sessionId: null,
  loading: false,
  error: null,

  loadWordLists: async (token: string) => {
    set({ loading: true, error: null });

    try {
      const result = await quizService.loadWordLists(token);
      if (result !== null) {
        set({ wordLists: result, loading: false });
      }
    } catch (error: unknown) {
      logger.error('Failed to load word lists', { error });
      set({
        error: extractErrorMessage(error, 'Failed to load word lists'),
        loading: false,
      });
    }
  },

  startQuiz: async (token: string, quizName: string) => {
    set({ loading: true, error: null, selectedQuiz: quizName });

    try {
      const result = await quizService.startQuiz(token, quizName);
      if (result !== null) {
        set({
          loading: false,
          quizManager: result.manager,
          currentQuestion: result.currentQuestion,
        });
      } else {
        set({
          loading: false,
          error: 'Failed to start quiz. Please try again.',
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to start quiz', { error, quizName });
      set({ error: extractErrorMessage(error, 'Failed to start quiz'), loading: false });
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

  revealAnswer: () => {
    const state = get();
    if (state.quizManager === null || state.currentQuestion === null) return null;

    return quizService.revealAnswer(state.quizManager, state.currentQuestion);
  },

  setLevel: async (level: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4', token?: string) => {
    const state = get();
    if (state.quizManager === null) {
      return { success: false, actualLevel: 'LEVEL_1' as const, message: 'Quiz not initialized' };
    }

    const result = await quizService.setLevel(state.quizManager, level, token);
    const questionResult = state.quizManager.getNextQuestion();
    set({ currentQuestion: questionResult.question });

    return result;
  },

  reset: () => {
    const state = get();
    quizService.cleanup();
    set({
      wordLists: state.wordLists,
      selectedQuiz: null,
      quizManager: null,
      currentQuestion: null,
      sessionId: null,
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

export const useWordLists = (): WordList[] => useQuizStore((state) => state.wordLists);
export const useSelectedQuiz = (): string | null => useQuizStore((state) => state.selectedQuiz);
export const useQuizManager = (): QuizManager | null => useQuizStore((state) => state.quizManager);
export const useCurrentQuestion = (): QuizQuestion | null => useQuizStore((state) => state.currentQuestion);
export const useQuizLoading = (): boolean => useQuizStore((state) => state.loading);
export const useQuizError = (): string | null => useQuizStore((state) => state.error);
