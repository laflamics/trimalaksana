import { useState, useEffect } from 'react';
import { languageService, type Language } from '../services/language';

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => languageService.getLanguage());

  useEffect(() => {
    // Subscribe to language changes
    const unsubscribe = languageService.subscribe((newLanguage) => {
      setLanguage(newLanguage);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const t = (key: string, defaultValue?: string): string => {
    return languageService.t(key, defaultValue);
  };

  const setLanguagePreference = (lang: Language) => {
    languageService.setLanguage(lang);
  };

  return {
    language,
    t,
    setLanguage: setLanguagePreference,
  };
}
