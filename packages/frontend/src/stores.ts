import { writable, get, derived, type Writable } from 'svelte/store';
import { jwtDecode } from 'jwt-decode';
import api from './api';
import type { QuizManager, QuizQuestion, SubmissionResult } from '@lingua-quiz/core';
import type { WordList, LevelWordLists, TranslationDisplay, AuthResponse } from './api-types';
import { STORAGE_KEYS, THEMES } from './lib/constants';
import { LEVEL_CONFIG } from './lib/config/levelConfig';
import { quizService } from './lib/services/QuizService';
import { safeStorage } from './lib/utils/safeStorage';

interface ThemeState {
  isDarkMode: boolean;
}

interface ThemeStore {
  subscribe: Writable<ThemeState>['subscribe'];
  toggleTheme: () => void;
  clearPreference: () => void;
}

function createThemeStore(): ThemeStore {
  const getInitialTheme = () => {
    if (typeof window === 'undefined') return false;
    const savedTheme = safeStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme !== null) return savedTheme === THEMES.DARK;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const applyTheme = (isDark: boolean) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  };

  const initialTheme = getInitialTheme();

  const { subscribe, set, update } = writable({
    isDarkMode: initialTheme,
  });

  applyTheme(initialTheme);

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      if (safeStorage.getItem(STORAGE_KEYS.THEME) === null) {
        const isDark = e.matches;
        applyTheme(isDark);
        set({ isDarkMode: isDark });
      }
    });
  }

  return {
    subscribe,
    toggleTheme: () => {
      update((state) => {
        const newTheme = !state.isDarkMode;
        safeStorage.setItem(STORAGE_KEYS.THEME, newTheme ? 'dark' : 'light');
        applyTheme(newTheme);
        return { isDarkMode: newTheme };
      });
    },
    clearPreference: () => {
      safeStorage.removeItem(STORAGE_KEYS.THEME);
      const systemPreference =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(systemPreference);
      set({ isDarkMode: systemPreference });
    },
  };
}

export const themeStore = createThemeStore();

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

interface AuthStore {
  subscribe: Writable<AuthState>['subscribe'];
  login: (username: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  logoutUser: () => void;
  register: (username: string, password: string) => Promise<AuthResponse>;
  deleteAccount: () => Promise<void>;
}

function createAuthStore(): AuthStore {
  const { subscribe, set } = writable<AuthState>({
    token: null,
    username: null,
    isAuthenticated: false,
    isAdmin: false,
  });

  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  async function refreshAccessToken() {
    const refreshToken = safeStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (refreshToken === null) {
      logoutUser();
      return;
    }

    try {
      const data = await api.refreshToken({ refresh_token: refreshToken });
      const currentState = get({ subscribe });
      setUser({
        token: data.token,
        username: currentState.username ?? data.user.username,
        refreshToken: data.refresh_token,
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      logoutUser();
    }
  }

  function scheduleTokenRefresh() {
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }

    const expirationStr = safeStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRATION);
    if (expirationStr === null) return;

    const expirationMs = parseInt(expirationStr, 10);
    const now = Date.now();
    const timeUntilExpiry = expirationMs - now;
    const refreshBeforeMs = 2 * 60 * 1000;
    const refreshIn = Math.max(0, timeUntilExpiry - refreshBeforeMs);

    refreshTimer = setTimeout(() => {
      void refreshAccessToken();
    }, refreshIn);
  }

  function checkToken() {
    const token = safeStorage.getItem(STORAGE_KEYS.TOKEN);

    if (token === null) {
      set({ token: null, username: null, isAuthenticated: false, isAdmin: false });
      return;
    }

    try {
      const payload = jwtDecode<{ exp: number; username?: string; sub?: string; isAdmin?: boolean }>(token);
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        void refreshAccessToken();
      } else {
        const username = payload.username ?? payload.sub ?? 'Unknown User';
        const isAdmin = payload.isAdmin ?? false;
        set({ token, username, isAuthenticated: true, isAdmin });
        scheduleTokenRefresh();
      }
    } catch {
      console.error('Invalid token found, logging out.');
      logoutUser();
    }
  }

  function setUser(data: { token: string; username: string; refreshToken?: string }) {
    safeStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
    if (data.refreshToken !== undefined) {
      safeStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
    }

    try {
      const payload = jwtDecode<{ exp: number; isAdmin?: boolean }>(data.token);
      const expirationMs = payload.exp * 1000;
      safeStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRATION, expirationMs.toString());
      const isAdmin = payload.isAdmin ?? false;
      set({ token: data.token, username: data.username, isAuthenticated: true, isAdmin });
      scheduleTokenRefresh();
    } catch (e) {
      console.error('Failed to parse token expiration:', e);
      set({ token: data.token, username: data.username, isAuthenticated: true, isAdmin: false });
    }
  }

  function logoutUser() {
    safeStorage.removeItem(STORAGE_KEYS.TOKEN);
    safeStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    safeStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRATION);
    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    set({ token: null, username: null, isAuthenticated: false, isAdmin: false });
  }

  if (typeof window !== 'undefined') {
    checkToken();
  }

  return {
    subscribe,
    login: async (username: string, password: string) => {
      const data = await api.login({ username, password });
      setUser({ token: data.token, username: data.user.username, refreshToken: data.refresh_token });
      return data;
    },
    logout: async () => {
      const state = get({ subscribe });
      if (state.token !== null) {
        try {
          await quizStore.saveAndCleanup(state.token);
        } catch (error) {
          console.error('Failed to save quiz progress during logout:', error);
        }
      }
      logoutUser();
    },
    logoutUser,
    register: async (username: string, password: string) => {
      const data = await api.register({ username, password });
      setUser({ token: data.token, username: data.user.username, refreshToken: data.refresh_token });
      return data;
    },
    deleteAccount: async () => {
      const state = get({ subscribe });
      if (state.token === null) throw new Error('Not authenticated');

      await api.deleteAccount(state.token);
      logoutUser();
    },
  };
}

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
  setLevel: (
    level: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4',
  ) => Promise<{ success: boolean; actualLevel: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4'; message?: string }>;
  reset: () => void;
  saveAndCleanup: (token: string) => Promise<void>;
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
        const message = error instanceof Error ? error.message : 'Failed to load word lists';
        update((state) => ({ ...state, error: message, loading: false }));
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
        const message = error instanceof Error ? error.message : 'Failed to start quiz';
        update((state) => ({ ...state, error: message, loading: false }));
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
        console.error('Failed to submit answer:', error);
        throw error;
      }
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
  };

  return store;
}

export const authStore = createAuthStore();
export const quizStore = createQuizStore();

quizService.setLogoutCallback(() => authStore.logoutUser());

export { safeStorage };

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
