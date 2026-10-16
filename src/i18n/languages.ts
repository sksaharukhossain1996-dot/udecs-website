export type LangCode = 'en' | 'hi' | 'bn' | 'ar' | 'es' | 'fr' | 'de' | 'pt' | 'ru' | 'zh' | 'ja' | 'id';
export const LANGUAGES: { code: LangCode; label: string; beta?: boolean; rtl?: boolean }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ar', label: 'العربية', beta: true, rtl: true },
  { code: 'es', label: 'Español', beta: true },
  { code: 'fr', label: 'Français', beta: true },
  { code: 'de', label: 'Deutsch', beta: true },
  { code: 'pt', label: 'Português', beta: true },
  { code: 'ru', label: 'Русский', beta: true },
  { code: 'zh', label: '中文', beta: true },
  { code: 'ja', label: '日本語', beta: true },
  { code: 'id', label: 'Bahasa Indonesia', beta: true },
];
// Extra languages load on demand so the first page stays small.
export async function loadExtraLanguage(code: string): Promise<Record<string, string> | null> {
  if (code === 'en' || code === 'hi' || code === 'bn') return null;
  const m = await import('./extra');
  return m.default[code] || null;
}
