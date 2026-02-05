import React, { createContext, useContext, useMemo } from 'react';
import { translations, TranslationKey, Language } from '../utils/translations';

interface LanguageContextType {
    t: (key: TranslationKey) => string;
    lang: Language;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ language: Language; children: React.ReactNode }> = ({ language, children }) => {
    const t = useMemo(() => {
        return (key: TranslationKey) => {
            return translations[language][key] || key;
        };
    }, [language]);

    const value = useMemo(() => ({ t, lang: language }), [t, language]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
