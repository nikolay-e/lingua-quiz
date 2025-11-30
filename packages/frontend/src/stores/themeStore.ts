import { writable, type Writable } from 'svelte/store';
import { STORAGE_KEYS, THEMES } from '../lib/constants';
import { safeStorage } from '../lib/utils/safeStorage';

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
