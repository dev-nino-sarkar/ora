// src/i18n/index.ts
// Lightweight i18n using i18n-js + Expo Localization.
// Supports runtime locale switching without app restart.

import { I18n } from 'i18n-js';
import * as ExpoLocalization from 'expo-localization';
import translations from '../../assets/i18n/translations.json';

export type Locale = 'en' | 'hi' | 'ta';

export const SUPPORTED_LOCALES: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
];

const i18n = new I18n(translations);

// Detect device locale, fallback to 'en'
const deviceLocale = ExpoLocalization.getLocales()?.[0]?.languageCode ?? 'en';
i18n.locale = SUPPORTED_LOCALES.some((l) => l.code === deviceLocale) ? deviceLocale : 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export { i18n };
export default i18n;
