import { translations } from "../i18n/translations";
import { useAppStore } from "../store/useAppStore";

export function useI18n() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  function t(key: string) {
    return translations[language][key] ?? translations.en[key] ?? key;
  }

  return { language, setLanguage, t };
}
