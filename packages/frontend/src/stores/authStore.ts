import { writable, get, type Writable } from 'svelte/store';
import { jwtDecode } from 'jwt-decode';
import api from '../api';
import { STORAGE_KEYS } from '../lib/constants';
import { safeStorage } from '../lib/utils/safeStorage';
import { logger } from '../lib/utils/logger';
import type { AuthResponse } from '../api-types';

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

type QuizStoreSaveCallback = (token: string) => Promise<void>;

let quizStoreSaveCallback: QuizStoreSaveCallback | null = null;

export function setQuizStoreRef(saveCallback: QuizStoreSaveCallback) {
  quizStoreSaveCallback = saveCallback;
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
      logger.error('Token refresh failed:', error);
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
      logger.error('Invalid token found, logging out.');
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
      logger.error('Failed to parse token expiration:', e);
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
      if (state.token !== null && quizStoreSaveCallback !== null) {
        try {
          await quizStoreSaveCallback(state.token);
        } catch (error) {
          logger.error('Failed to save quiz progress during logout:', error);
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

export const authStore = createAuthStore();
