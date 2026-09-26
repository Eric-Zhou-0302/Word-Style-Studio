import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { uiMessages } from './uiMessages';
import { diagnosticMessages } from './diagnosticMessages';
import { translateDiagnostic } from './diagnostics';

export type Locale = 'zh' | 'en';
export const LOCALE_KEY = 'style-studio.locale.v1';
export type LocalizedMessage = string | { zh: string; en: string };
function fill(template: string, values: readonly unknown[]) {
  return template.replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index)] ?? ''));
}
export function translateUI(text: string, locale: Locale): string {
  return locale === 'en' ? uiMessages[text] ?? diagnosticMessages[text] ?? text : text;
}
export function formatUI(key: string, locale: Locale, ...values: unknown[]): string {
  return fill(translateUI(key, locale), values);
}
function translators(locale: Locale) {
  return { ui: (text: string) => translateUI(text, locale), fmt: (key: string, ...values: unknown[]) => formatUI(key, locale, ...values) };
}
// 通知与确认框保存两种文案，不依赖全局缓存，也不改写方案数据。
function message(build: (tools: ReturnType<typeof translators>) => string): LocalizedMessage {
  return { zh: build(translators('zh')), en: build(translators('en')) };
}
function readLocale(): Locale {
  try { return localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'zh'; }
  catch { return 'zh'; }
}
const I18nContext = createContext<{ locale: Locale; setLocale: (value: Locale) => void } | null>(null);
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readLocale);
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    try { localStorage.setItem(LOCALE_KEY, locale); } catch { /* 本次语言切换不依赖存储权限。 */ }
  }, [locale]);
  const context = useMemo(() => ({ locale, setLocale }), [locale]);
  return <I18nContext.Provider value={context}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n requires I18nProvider');
  const { locale } = context;
  const t = useCallback((zh: string, en: string) => locale === 'zh' ? zh : en, [locale]);
  const ui = useCallback((text: string) => translateUI(text, locale), [locale]);
  const fmt = useCallback((key: string, ...values: unknown[]) => formatUI(key, locale, ...values), [locale]);
  const renderMessage = useCallback((value: LocalizedMessage) => translateDiagnostic(translateUI(typeof value === 'string' ? value : value[locale], locale), locale), [locale]);
  const diagnostic = useCallback((value: string) => translateDiagnostic(value, locale), [locale]);
  const listLabel = (kind: 'multilevel' | 'bullet' | 'numbered') => t({multilevel:'多级列表',bullet:'项目符号',numbered:'编号列表'}[kind], {multilevel:'Multilevel list',bullet:'Bulleted list',numbered:'Numbered list'}[kind]);
  return { ...context, t, ui, fmt, message, renderMessage, diagnostic, listLabel };
}
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  // 切换界面语言时保留输入焦点，避免数字或颜色输入的失焦校正清空未完成草稿。
  return <div className="language-switcher" onPointerDown={event => event.preventDefault()} role="group" aria-label={t('界面语言', 'Interface language')}>
    <button type="button" lang="zh-CN" aria-pressed={locale === 'zh'} onClick={() => setLocale('zh')}>中文</button>
    <button type="button" lang="en" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button>
  </div>;
}
