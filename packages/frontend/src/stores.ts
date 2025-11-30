import { writable, get, derived, type Writable } from 'svelte/store';
import { jwtDecode } from 'jwt-decode';
import api from './api';
import { QuizManager, type QuizQuestion, type SubmissionResult } from '@lingua-quiz/core';
import type { WordList, LevelWordLists, TranslationDisplay, AuthResponse } from './api-types';
import { STORAGE_KEYS, THEMES } from './lib/constants';
import { LEVEL_CONFIG } from './lib/config/levelConfig';

const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof localStorage === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn(`Failed to save to localStorage: ${key}`);
    }
  },
  removeItem: (key: string): void => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      console.warn(`Failed to remove from localStorage: ${key}`);
    }
  },
};

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

  const DEBOUNCE_DELAY = 1000;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let saveInProgress = false;

  const progressMap = new Map<
    string,
    { level: number; queuePosition: number; correctCount: number; incorrectCount: number; targetLanguage: string }
  >();

  const bulkSaveProgress = async (token: string): Promise<void> => {
    if (saveInProgress) return;

    const state = get(store);
    if (state.quizManager === null || progressMap.size === 0) return;

    saveInProgress = true;

    const itemsToSave = new Map(progressMap);
    progressMap.clear();

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    try {
      const persistencePromises: Promise<void>[] = [];

      for (const [vocabularyItemId, progress] of itemsToSave.entries()) {
        const payload = {
          vocabularyItemId,
          level: progress.level,
          queuePosition: progress.queuePosition,
          correctCount: progress.correctCount,
          incorrectCount: progress.incorrectCount,
        };
        persistencePromises.push(
          api.saveProgress(token, payload).catch((err: unknown) => {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error(`Progress save failed for ${vocabularyItemId}:`, errorMessage, 'Payload:', payload);
            if (!progressMap.has(vocabularyItemId)) {
              progressMap.set(vocabularyItemId, progress);
            }
          }),
        );
      }

      if (persistencePromises.length > 0) {
        await Promise.allSettled(persistencePromises);
      }
    } catch (error) {
      const errorInfo = handleQuiz401Error(error);
      if (!errorInfo.isUnauthorized) {
        console.error('Bulk save error:', error);
      }
      for (const [id, progress] of itemsToSave.entries()) {
        if (!progressMap.has(id)) {
          progressMap.set(id, progress);
        }
      }
    } finally {
      saveInProgress = false;
    }
  };

  const debouncedBulkSave = (token: string) => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => bulkSaveProgress(token), DEBOUNCE_DELAY);
  };

  const handleQuiz401Error = (error: unknown) => {
    if (error instanceof Error && error.message === 'Unauthorized') {
      console.warn('Session expired during quiz operation. Redirecting to login.');
      authStore.logoutUser();
      return { isUnauthorized: true, message: 'Your session has expired. Please log in again.' };
    }
    return { isUnauthorized: false, message: error instanceof Error ? error.message : 'Unknown error' };
  };

  async function withAuth401Handling<T>(
    operation: () => Promise<T>,
    onError?: (error: unknown) => void,
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      const errorInfo = handleQuiz401Error(error);
      if (onError !== undefined) {
        onError(errorInfo.message);
      }
      if (!errorInfo.isUnauthorized) {
        throw error;
      }
      return null;
    }
  }

  const store = {
    subscribe,

    loadWordLists: async (token: string) => {
      update((state) => ({ ...state, loading: true, error: null }));

      const versionChanged = await withAuth401Handling(async () => {
        const currentVersion = await api.fetchContentVersion(token);
        const savedVersion = safeStorage.getItem(STORAGE_KEYS.CONTENT_VERSION);

        const currentVersionId = currentVersion.versionId.toString();
        if (savedVersion !== null && parseInt(savedVersion) !== currentVersion.versionId) {
          console.info(`Content version changed: ${savedVersion} -> ${currentVersionId}. Clearing cache.`);
          safeStorage.setItem(STORAGE_KEYS.CONTENT_VERSION, currentVersionId);
          return true;
        }

        safeStorage.setItem(STORAGE_KEYS.CONTENT_VERSION, currentVersionId);
        return false;
      });

      if (versionChanged === true) {
        progressMap.clear();
      }

      const result = await withAuth401Handling(
        () => api.fetchWordLists(token),
        (error) => update((state) => ({ ...state, error: error as string, loading: false })),
      );

      if (result !== null) {
        update((state) => ({ ...state, wordLists: result, loading: false }));
      }
    },

    startQuiz: async (token: string, quizName: string) => {
      update((state) => ({ ...state, loading: true, error: null, selectedQuiz: quizName }));

      const result = await withAuth401Handling(
        async () => {
          const [translations, userProgress] = await Promise.all([
            api.fetchTranslations(token, quizName),
            api.fetchUserProgress(token, quizName),
          ]);

          const progressLookup = new Map(
            userProgress.map((p) => [
              p.vocabularyItemId,
              {
                level: p.level,
                queuePosition: p.queuePosition,
                correctCount: p.correctCount,
                incorrectCount: p.incorrectCount,
              },
            ]),
          );

          // Check if user has any saved progress with initialized queue positions
          const hasInitializedProgress = userProgress.some((p) => p.queuePosition > 0);

          // Shuffle translations only for new users (no saved progress)
          let orderedTranslations = translations;
          if (!hasInitializedProgress && translations.length > 0) {
            orderedTranslations = [...translations].sort(() => Math.random() - 0.5);
          }

          const translationData = orderedTranslations.map((word) => ({
            id: word.id,
            sourceText: word.sourceText,
            sourceLanguage: word.sourceLanguage,
            sourceUsageExample: word.sourceUsageExample ?? '',
            targetText: word.targetText,
            targetLanguage: word.targetLanguage,
            targetUsageExample: word.targetUsageExample ?? '',
            listName: word.listName,
          }));

          const progress = orderedTranslations.map((word, index) => {
            const userProg = progressLookup.get(word.id);
            const level = userProg?.level ?? 0;
            const queuePosition = userProg?.queuePosition ?? index;

            return {
              translationId: word.id,
              level: `LEVEL_${level}` as 'LEVEL_0' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4' | 'LEVEL_5',
              queuePosition,
              consecutiveCorrect: 0,
              recentHistory: [] as boolean[],
            };
          });

          progressMap.clear();

          // Initialize progressMap with persisted counts from database (keyed by vocabularyItemId)
          for (const [vocabularyItemId, prog] of progressLookup.entries()) {
            const translation = orderedTranslations.find((t) => t.id === vocabularyItemId);
            if (translation !== undefined) {
              progressMap.set(vocabularyItemId, {
                level: prog.level,
                queuePosition: prog.queuePosition,
                correctCount: prog.correctCount,
                incorrectCount: prog.incorrectCount,
                targetLanguage: translation.targetLanguage,
              });
            }
          }

          const manager = new QuizManager(translationData, {
            progress,
            currentLevel: 'LEVEL_1',
          });

          await bulkSaveProgress(token);

          const questionResult = manager.getNextQuestion();
          const currentQuestion = questionResult.question;

          return { manager, currentQuestion };
        },
        (error) => update((state) => ({ ...state, error: error as string, loading: false })),
      );

      if (result !== null) {
        update((state) => ({
          ...state,
          loading: false,
          quizManager: result.manager,
          currentQuestion: result.currentQuestion,
        }));
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
        const feedback = state.quizManager.submitAnswer(state.currentQuestion.translationId, answer);

        const { translationId } = state.currentQuestion;
        const translation = state.quizManager.getTranslation(translationId);
        if (translation === undefined) {
          console.error(`Translation not found for ID ${translationId}`);
          return feedback;
        }

        const quizState = state.quizManager.getState();
        const currentProgress = quizState.progress.find((p) => p.translationId === translationId);

        if (currentProgress === undefined) {
          console.error(`Progress not found for translation ID ${translationId}`);
          return feedback;
        }

        const level = parseInt(currentProgress.level.replace('LEVEL_', ''));
        const existing = progressMap.get(translation.id) ?? {
          correctCount: 0,
          incorrectCount: 0,
          level: 0,
          queuePosition: 0,
          targetLanguage: translation.targetLanguage,
        };

        progressMap.set(translation.id, {
          level,
          queuePosition: currentProgress.queuePosition ?? 0,
          correctCount: existing.correctCount + (feedback.isCorrect ? 1 : 0),
          incorrectCount: existing.incorrectCount + (feedback.isCorrect ? 0 : 1),
          targetLanguage: translation.targetLanguage,
        });

        debouncedBulkSave(token);

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

      try {
        if (token !== undefined) {
          try {
            await bulkSaveProgress(token);
          } catch (error) {
            console.error('Failed to save progress before level change:', error);
          }
        }

        const result = state.quizManager.setLevel(level);
        const questionResult = state.quizManager.getNextQuestion();
        const nextQuestion = questionResult.question;

        update((s) => ({ ...s, currentQuestion: nextQuestion }));

        return result;
      } catch (error) {
        console.error('Failed to set level:', error);
        return { success: false, actualLevel: 'LEVEL_1' as const, message: 'Failed to set level' };
      }
    },

    reset: () => {
      const state = get(store);
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      progressMap.clear();
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

    saveAndCleanup: (token: string) => {
      const state = get(store);
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (state.quizManager !== null) {
        void bulkSaveProgress(token).catch((err: unknown) => console.error('Failed to save progress on stop:', err));
      }
      return Promise.resolve();
    },
  };

  return store;
}

export const authStore = createAuthStore();
export const quizStore = createQuizStore();

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
