import { Request } from 'express';
import pt from './pt.json';
import en from './en.json';

const messages = {
  pt,
  en,
};

type Lang = keyof typeof messages;

const normalizeLang = (value?: string | string[]) => {
  if (!value) return 'pt';
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw.split(',')[0]?.trim().toLowerCase();
  if (!normalized) return 'pt';
  if (normalized.startsWith('pt')) return 'pt';
  if (normalized.startsWith('en')) return 'en';
  return 'pt';
};

export const resolveLang = (req: Request): Lang => {
  const header = (req.headers['x-lang'] as string | undefined) || req.headers['accept-language'];
  return normalizeLang(header) as Lang;
};

export const getMessage = (code: string, lang: Lang = 'pt') => {
  const bundle = messages[lang] || messages.pt;
  return bundle[code as keyof typeof pt] || bundle['GEN-001'];
};
