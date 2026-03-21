import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import api, { type AuthResponse } from '@api';
import { STORAGE_KEYS, safeStorage, logger, clearTimer } from '@shared/utils';

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

interface AuthActions {
  login: (username: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  logoutUser: () => void;
  register: (username: string, password: string) => Promise<AuthResponse>;
  deleteAccount: () => Promise<void>;
  checkToken: () => void;
}

type AuthStore = AuthState & AuthActions;

type AuthChannelMessage = { type: 'token-refreshed' } | { type: 'logout' };

type QuizStoreSaveCallback = (token: string) => Promise<void>;

let quizStoreSaveCallback: QuizStoreSaveCallback | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let isRefreshing = false;
const authChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('auth-channel') : null;

export function setQuizStoreRef(saveCallback: QuizStoreSaveCallback): void {
  quizStoreSaveCallback = saveCallback;
}

function scheduleTokenRefresh(refreshAccessToken: () => Promise<void>): void {
  refreshTimer = clearTimer(refreshTimer);

  const expirationStr = safeStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRATION);
  if (expirationStr === null) return;

  const expirationMs = parseInt(expirationStr, 10);
  const now = Date.now();
  const timeUntilExpiry = expirationMs - now;
  const refreshBeforeMs = 3 * 60 * 1000;
  const refreshIn = Math.max(0, timeUntilExpiry - refreshBeforeMs);

  refreshTimer = setTimeout(() => {
    void refreshAccessToken();
  }, refreshIn);
}

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector((set, get) => {
    const logoutUser = (): void => {
      safeStorage.removeItem(STORAGE_KEYS.TOKEN);
      safeStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      safeStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRATION);
      refreshTimer = clearTimer(refreshTimer);
      set({ token: null, username: null, isAuthenticated: false, isAdmin: false });
    };

    const setUser = (data: { token: string; username: string; refreshToken?: string }): void => {
      safeStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
      if (data.refreshToken !== undefined) {
        safeStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      }

      try {
        const payload = jwtDecode<{ exp: number; isAdmin?: boolean; is_admin?: boolean }>(data.token);
        const expirationMs = payload.exp * 1000;
        safeStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRATION, expirationMs.toString());
        const isAdmin = payload.isAdmin ?? payload.is_admin ?? false;
        set({ token: data.token, username: data.username, isAuthenticated: true, isAdmin });
        scheduleTokenRefresh(refreshAccessToken);
      } catch (error: unknown) {
        logger.error('Failed to parse token expiration:', error);
        set({ token: data.token, username: data.username, isAuthenticated: true, isAdmin: false });
      }
    };

    const refreshAccessToken = async (): Promise<void> => {
      if (isRefreshing) return;

      isRefreshing = true;
      const refreshToken = safeStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken === null) {
        isRefreshing = false;
        logoutUser();
        return;
      }

      try {
        const data = await api.refreshToken({ refresh_token: refreshToken });
        const currentState = get();
        setUser({
          token: data.token,
          username: currentState.username ?? data.user.username,
          refreshToken: data.refresh_token,
        });
        authChannel?.postMessage({ type: 'token-refreshed' });
      } catch (error: unknown) {
        logger.error('Token refresh failed:', error);
        logoutUser();
        authChannel?.postMessage({ type: 'logout' });
      } finally {
        isRefreshing = false;
      }
    };

    const checkToken = (): void => {
      const token = safeStorage.getItem(STORAGE_KEYS.TOKEN);

      if (token === null) {
        set({ token: null, username: null, isAuthenticated: false, isAdmin: false });
        return;
      }

      try {
        const payload = jwtDecode<{
          exp: number;
          username?: string;
          sub?: string;
          isAdmin?: boolean;
          is_admin?: boolean;
        }>(token);
        const isExpired = payload.exp * 1000 < Date.now();

        if (isExpired) {
          void refreshAccessToken();
        } else {
          const username = payload.username ?? payload.sub ?? 'Unknown User';
          const isAdmin = payload.isAdmin ?? payload.is_admin ?? false;
          set({ token, username, isAuthenticated: true, isAdmin });
          scheduleTokenRefresh(refreshAccessToken);
        }
      } catch {
        logger.error('Invalid token found, logging out.');
        logoutUser();
      }
    };

    return {
      token: null,
      username: null,
      isAuthenticated: false,
      isAdmin: false,

      login: async (username: string, password: string) => {
        const data = await api.login({ username, password });
        setUser({ token: data.token, username: data.user.username, refreshToken: data.refresh_token });
        authChannel?.postMessage({ type: 'token-refreshed' });
        return data;
      },

      logout: async () => {
        const state = get();
        if (state.token !== null && quizStoreSaveCallback !== null) {
          try {
            await quizStoreSaveCallback(state.token);
          } catch (error: unknown) {
            logger.error('Failed to save quiz progress during logout:', error);
          }
        }
        logoutUser();
        authChannel?.postMessage({ type: 'logout' });
      },

      logoutUser,

      register: async (username: string, password: string) => {
        const data = await api.register({ username, password });
        setUser({ token: data.token, username: data.user.username, refreshToken: data.refresh_token });
        authChannel?.postMessage({ type: 'token-refreshed' });
        return data;
      },

      deleteAccount: async () => {
        const state = get();
        if (state.token === null) throw new Error('Not authenticated');

        await api.deleteAccount(state.token);
        logoutUser();
        authChannel?.postMessage({ type: 'logout' });
      },

      checkToken,
    };
  }),
);

if (typeof window !== 'undefined') {
  useAuthStore.getState().checkToken();

  if (authChannel !== null) {
    authChannel.onmessage = (event: MessageEvent<AuthChannelMessage>): void => {
      if (event.data.type === 'token-refreshed') {
        useAuthStore.getState().checkToken();
      } else {
        useAuthStore.getState().logoutUser();
      }
    };
  }
}

export const useIsAuthenticated = (): boolean => useAuthStore((state) => state.isAuthenticated);
export const useIsAdmin = (): boolean => useAuthStore((state) => state.isAdmin);
export const useToken = (): string | null => useAuthStore((state) => state.token);
export const useUsername = (): string | null => useAuthStore((state) => state.username);
