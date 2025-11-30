export const PAGES = {
  LOGIN: 'login',
  REGISTER: 'register',
  QUIZ: 'quiz',
  ADMIN: 'admin',
} as const;

export type PageType = (typeof PAGES)[keyof typeof PAGES];

export type { LevelStatus } from '@lingua-quiz/core';

export const DEFAULT_LEVEL = 'LEVEL_1' as const;

export const EVENTS = {
  NAVIGATE: 'navigate',
  SELECT: 'select',
  BACK_TO_MENU: 'backToMenu',
  TOGGLE_FOLD: 'toggleFold',
  PLAY_TTS: 'playTTS',
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    DELETE_ACCOUNT: '/auth/delete-account',
  },
  TTS: {
    SYNTHESIZE: '/tts/synthesize',
    LANGUAGES: '/tts/languages',
  },
} as const;

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

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type ThemeType = (typeof THEMES)[keyof typeof THEMES];
