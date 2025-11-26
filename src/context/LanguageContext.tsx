import React, { createContext, useContext, useState, useEffect } from "react";
import { en } from "../i18n/en";
import { fr } from "../i18n/fr";
import { de } from "../i18n/de";

type Language = "en" | "fr" | "de";

const translations: Record<Language, typeof en> = {
  en,
  fr,
  de,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language") as Language | null;
    return saved || "en";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (path: string): string => {
    const keys = path.split(".");
    let value: any = translations[language];

    for (const key of keys) {
      value = value?.[key];
    }

    return value || path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
