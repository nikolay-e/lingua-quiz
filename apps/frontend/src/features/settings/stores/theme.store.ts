import { create } from 'zustand';
import { STORAGE_KEYS, THEME_MODES, safeStorage, type ThemeMode } from '@shared/utils';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
}

interface ThemeActions {
  setMode: (mode: ThemeMode) => void;
}

type ThemeStore = ThemeState & ThemeActions;

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

function applyTheme(resolved: 'light' | 'dark'): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolved);
  }
}

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return THEME_MODES.SYSTEM;
  const savedMode = safeStorage.getItem(STORAGE_KEYS.THEME);
  if (savedMode === THEME_MODES.LIGHT || savedMode === THEME_MODES.DARK || savedMode === THEME_MODES.SYSTEM) {
    return savedMode;
  }
  return THEME_MODES.SYSTEM;
}

const initialMode = getInitialMode();
const initialResolved = resolveTheme(initialMode);

if (typeof window !== 'undefined') {
  applyTheme(initialResolved);
}

function handleSystemThemeChange(set: (state: Partial<ThemeState>) => void): void {
  const currentMode = safeStorage.getItem(STORAGE_KEYS.THEME) ?? THEME_MODES.SYSTEM;
  if (currentMode === THEME_MODES.SYSTEM) {
    const resolved = resolveTheme(THEME_MODES.SYSTEM);
    applyTheme(resolved);
    set({ mode: THEME_MODES.SYSTEM, resolvedTheme: resolved });
  }
}

let mediaQueryListener: (() => void) | null = null;

export const useThemeStore = create<ThemeStore>()((set) => {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    if (mediaQueryListener !== null) {
      mediaQuery.removeEventListener('change', mediaQueryListener);
    }

    mediaQueryListener = () => handleSystemThemeChange(set);
    mediaQuery.addEventListener('change', mediaQueryListener);
  }

  return {
    mode: initialMode,
    resolvedTheme: initialResolved,

    setMode: (mode: ThemeMode) => {
      safeStorage.setItem(STORAGE_KEYS.THEME, mode);
      const resolved = resolveTheme(mode);
      applyTheme(resolved);
      set({ mode, resolvedTheme: resolved });
    },
  };
});

export const useThemeMode = (): ThemeMode => useThemeStore((state) => state.mode);
export const useResolvedTheme = (): 'light' | 'dark' => useThemeStore((state) => state.resolvedTheme);
