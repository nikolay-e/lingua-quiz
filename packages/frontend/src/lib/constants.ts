export const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USERNAME: 'username',
  TOKEN_EXPIRATION: 'tokenExpiration',
  THEME: 'theme',
  FOLDED_LISTS: 'foldedLists',
  CONTENT_VERSION: 'contentVersion',
  PENDING_PROGRESS: 'pendingProgress',
} as const;

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type ThemeMode = (typeof THEME_MODES)[keyof typeof THEME_MODES];
