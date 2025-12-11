import { writable, get, type Writable } from 'svelte/store';
import type { QuizManager, QuizQuestion, SubmissionResult, RevealResult } from '@lingua-quiz/core';
import type { WordList } from '../api-types';
import { logger } from '../lib/utils/logger';
import { quizService } from '../lib/services/QuizService';
import { extractErrorMessage } from '../lib/utils/error';

interface QuizState {
  wordLists: WordList[];
  selectedQuiz: string | null;
  quizManager: QuizManager | null;
  currentQuestion: QuizQuestion | null;
  sessionId: string | null;
  loading: boolean;
  error: string | null;
}

interface QuizStore {
  subscribe: Writable<QuizState>['subscribe'];
  loadWordLists: (token: string) => Promise<void>;
  startQuiz: (token: string, quizName: string) => Promise<void>;
  getNextQuestion: () => QuizQuestion | null;
  submitAnswer: (token: string, answer: string) => Promise<SubmissionResult | null>;
  revealAnswer: () => RevealResult | null;
  setLevel: (
    level: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4',
  ) => Promise<{ success: boolean; actualLevel: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4'; message?: string }>;
  reset: () => void;
  saveAndCleanup: (token: string) => Promise<void>;
  flushImmediately: (token: string, isUnloading?: boolean) => void;
  restorePending: (token: string) => Promise<void>;
  hasPendingChanges: () => boolean;
  setSaveErrorCallback: (callback: (message: string) => void) => void;
}

function createQuizStore(): QuizStore {
  const { subscribe, set, update } = writable<QuizState>({
    wordLists: [],
    selectedQuiz: null,
    quizManager: null,
    currentQuestion: null,
    sessionId: null,
    loading: false,
    error: null,
  });

  const store = {
    subscribe,

    loadWordLists: async (token: string) => {
      update((state) => ({ ...state, loading: true, error: null }));

      try {
        const result = await quizService.loadWordLists(token);
        if (result !== null) {
          update((state) => ({ ...state, wordLists: result, loading: false }));
        }
      } catch (error) {
        update((state) => ({
          ...state,
          error: extractErrorMessage(error, 'Failed to load word lists'),
          loading: false,
        }));
      }
    },

    startQuiz: async (token: string, quizName: string) => {
      update((state) => ({ ...state, loading: true, error: null, selectedQuiz: quizName }));

      try {
        const result = await quizService.startQuiz(token, quizName);
        if (result !== null) {
          update((state) => ({
            ...state,
            loading: false,
            quizManager: result.manager,
            currentQuestion: result.currentQuestion,
          }));
        }
      } catch (error) {
        update((state) => ({ ...state, error: extractErrorMessage(error, 'Failed to start quiz'), loading: false }));
      }
    },

    getNextQuestion: () => {
      const state = get(store);
      if (state.quizManager === null) return null;

      const questionResult = state.quizManager.getNextQuestion();
      const { question } = questionResult;

      update((s) => ({ ...s, currentQuestion: question }));
      return question;
    },

    submitAnswer: async (token: string, answer: string) => {
      const state = get(store);
      if (state.quizManager === null || state.currentQuestion === null) return null;

      try {
        const feedback = quizService.submitAnswer(state.quizManager, state.currentQuestion, answer, token);
        return feedback;
      } catch (error) {
        logger.error('Failed to submit answer:', error);
        throw error;
      }
    },

    revealAnswer: () => {
      const state = get(store);
      if (state.quizManager === null || state.currentQuestion === null) return null;

      return quizService.revealAnswer(state.quizManager, state.currentQuestion);
    },

    setLevel: async (level: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4', token?: string) => {
      const state = get(store);
      if (state.quizManager === null) {
        return { success: false, actualLevel: 'LEVEL_1' as const, message: 'Quiz not initialized' };
      }

      const result = await quizService.setLevel(state.quizManager, level, token);
      const questionResult = state.quizManager.getNextQuestion();
      update((s) => ({ ...s, currentQuestion: questionResult.question }));

      return result;
    },

    reset: () => {
      const state = get(store);
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
      const state = get(store);
      await quizService.saveAndCleanup(token, state.quizManager);
    },

    flushImmediately: (token: string, isUnloading = false) => {
      const state = get(store);
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
  };

  return store;
}

export const quizStore = createQuizStore();
