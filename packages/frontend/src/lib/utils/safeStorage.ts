import { logger } from './logger';

export const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof localStorage === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      logger.debug(`Failed to read from localStorage: ${key}`, { error: e });
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      logger.warn(`Failed to save to localStorage: ${key}`, { error: e });
    }
  },
  removeItem: (key: string): void => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      logger.warn(`Failed to remove from localStorage: ${key}`, { error: e });
    }
  },
};
