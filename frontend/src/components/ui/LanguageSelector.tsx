import React from 'react';
import { useTranslation } from 'react-i18next';
import { languageConfig } from '../../i18n/config';

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  return (
    <div className="flex items-center space-x-2">
      <select
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {Object.entries(languageConfig.languages).map(([code, lang]) => (
          <option key={code} value={code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};
