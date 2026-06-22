import React from 'react';
import { useTranslation } from 'react-i18next';
import { languageConfig } from '../../i18n/config';

interface LocalizedWrapperProps {
  children: React.ReactNode;
}

export const LocalizedWrapper: React.FC<LocalizedWrapperProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language as keyof typeof languageConfig.languages) || 'en';
  const currentDir = languageConfig.languages[currentLang]?.dir || 'ltr';

  return (
    <div 
      dir={currentDir} 
      className={`min-h-screen w-full bg-slate-50 text-slate-900 transition-all duration-300 ${
        currentDir === 'rtl' ? 'font-sans' : 'font-sans'
      }`}
      style={{ direction: currentDir as any }}
    >
      {children}
    </div>
  );
};
