import { writable, type Writable } from 'svelte/store';
import { STORAGE_KEYS, THEME_MODES, type ThemeMode } from '../lib/constants';
import { safeStorage } from '../lib/utils/safeStorage';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
}

interface ThemeStore {
  subscribe: Writable<ThemeState>['subscribe'];
  setMode: (mode: ThemeMode) => void;
}

function getSystemPreference(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === THEME_MODES.SYSTEM) {
    return getSystemPreference() ? 'dark' : 'light';
  }
  return mode;
}

function createThemeStore(): ThemeStore {
  const getInitialMode = (): ThemeMode => {
    if (typeof window === 'undefined') return THEME_MODES.SYSTEM;
    const savedMode = safeStorage.getItem(STORAGE_KEYS.THEME);
    if (savedMode === THEME_MODES.LIGHT || savedMode === THEME_MODES.DARK || savedMode === THEME_MODES.SYSTEM) {
      return savedMode;
    }
    return THEME_MODES.SYSTEM;
  };

  const applyTheme = (resolved: 'light' | 'dark') => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolved);
    }
  };

  const initialMode = getInitialMode();
  const initialResolved = resolveTheme(initialMode);

  const { subscribe, set } = writable<ThemeState>({
    mode: initialMode,
    resolvedTheme: initialResolved,
  });

  applyTheme(initialResolved);

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      const currentMode = safeStorage.getItem(STORAGE_KEYS.THEME) ?? THEME_MODES.SYSTEM;
      if (currentMode === THEME_MODES.SYSTEM) {
        const resolved = resolveTheme(THEME_MODES.SYSTEM);
        applyTheme(resolved);
        set({ mode: THEME_MODES.SYSTEM, resolvedTheme: resolved });
      }
    });
  }

  return {
    subscribe,
    setMode: (mode: ThemeMode) => {
      safeStorage.setItem(STORAGE_KEYS.THEME, mode);
      const resolved = resolveTheme(mode);
      applyTheme(resolved);
      set({ mode, resolvedTheme: resolved });
    },
  };
}

export const themeStore = createThemeStore();
