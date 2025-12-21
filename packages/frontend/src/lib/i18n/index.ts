import { browser } from '$app/environment';
import { init, register, getLocaleFromNavigator, locale, waitLocale } from 'svelte-i18n';

const STORAGE_KEY = 'lingua-quiz-locale';
const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = ['en', 'ru', 'es', 'de'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

register('en', () => import('./locales/en.json'));
register('ru', () => import('./locales/ru.json'));
register('es', () => import('./locales/es.json'));
register('de', () => import('./locales/de.json'));

function getInitialLocale(): string {
  if (browser) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
      return stored;
    }

    const browserLocale = getLocaleFromNavigator();
    if (browserLocale !== null && browserLocale !== undefined) {
      const langCode = browserLocale.split('-')[0];
      if (langCode !== undefined && langCode !== '' && SUPPORTED_LOCALES.includes(langCode as SupportedLocale)) {
        return langCode;
      }
    }
  }
  return DEFAULT_LOCALE;
}

let initialized = false;

export async function initI18n(): Promise<void> {
  if (initialized) return;
  initialized = true;

  await init({
    fallbackLocale: DEFAULT_LOCALE,
    initialLocale: getInitialLocale(),
  });

  await waitLocale();
}

export function setLocale(newLocale: SupportedLocale): void {
  void locale.set(newLocale);
  if (browser) {
    localStorage.setItem(STORAGE_KEY, newLocale);
  }
}

export function getSupportedLocales(): readonly SupportedLocale[] {
  return SUPPORTED_LOCALES;
}

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  de: 'Deutsch',
};

export { locale } from 'svelte-i18n';
