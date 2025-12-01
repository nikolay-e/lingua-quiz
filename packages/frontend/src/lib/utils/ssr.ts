export const isBrowser = (): boolean => typeof window !== 'undefined';

export const isServer = (): boolean => !isBrowser();

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser()) return null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (!isBrowser()) return;
    localStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    if (!isBrowser()) return;
    localStorage.removeItem(key);
  },
};

export const safeWindow = {
  location: (): Location | null => {
    if (!isBrowser()) return null;
    return window.location;
  },
  matchMedia: (query: string): MediaQueryList | null => {
    if (!isBrowser()) return null;
    return window.matchMedia(query);
  },
};
