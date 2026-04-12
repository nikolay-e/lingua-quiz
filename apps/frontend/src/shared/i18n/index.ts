import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { safeStorage } from '@shared/utils';

import en from './locales/en.json';
import ru from './locales/ru.json';
import es from './locales/es.json';
import de from './locales/de.json';

const STORAGE_KEY = 'lingua-quiz-locale';
const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = ['en', 'ru', 'es', 'de'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function getInitialLocale(): string {
  if (typeof window !== 'undefined') {
    const stored = safeStorage.getItem(STORAGE_KEY);
    if (stored !== null && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
      return stored;
    }

    const browserLocale = navigator.language;
    const langCode = browserLocale.split('-')[0];
    if (langCode !== undefined && langCode !== '' && SUPPORTED_LOCALES.includes(langCode as SupportedLocale)) {
      return langCode;
    }
  }
  return DEFAULT_LOCALE;
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      es: { translation: es },
      de: { translation: de },
    },
    lng: getInitialLocale(),
    fallbackLng: DEFAULT_LOCALE,
    interpolation: {
      escapeValue: false,
    },
  })
  .catch(() => {});

export function setLocale(newLocale: SupportedLocale): void {
  i18n.changeLanguage(newLocale).catch(() => {});
  if (typeof window !== 'undefined') {
    safeStorage.setItem(STORAGE_KEY, newLocale);
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

export { i18n };
export default i18n;
