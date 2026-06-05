import { en } from '../locales/en.js';
import { ru } from '../locales/ru.js';

const LANG_KEY = 'complexityFilterLang';

const LOCALES = { en, ru };

export const getLang    = ()  => localStorage.getItem(LANG_KEY) ?? 'en';
export const getStrings = ()  => LOCALES[getLang()] ?? en;

export const setLang = (panel, code) => {
    panel.setAttribute('data-lang', code);
    localStorage.setItem(LANG_KEY, code);
};

export const toggleLang = (panel) => {
    const next = getLang() === 'en' ? 'ru' : 'en';
    setLang(panel, next);
};

export const applyInitialLang = (panel) => setLang(panel, getLang());