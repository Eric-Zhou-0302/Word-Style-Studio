import { diagnosticMessages } from './diagnosticMessages';
import type { Locale } from './i18n';

const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = Object.entries(diagnosticMessages)
  .filter(([key]) => /\{\d+\}/.test(key))
  .sort(([a], [b]) => b.replace(/\{\d+\}/g, '').length - a.replace(/\{\d+\}/g, '').length)
  .map(([key, english]) => ({ key, english, pattern: new RegExp('^' + key.split(/\{\d+\}/g).map(escapePattern).join('([\\s\\S]*?)') + '$') }));
const contextSuffixes: Record<string, string> = { 表格: 'table', 单元格: 'cell', 条件区域: 'conditional region', 编号段落: 'numbering paragraph' };
function contextLabel(context: string): string {
  const named = /^(样式|列表)“([\s\S]*)”(?:第 (\d+) 级(覆盖)?)?((?:表格|单元格|条件区域|编号段落)*)$/.exec(context);
  if (named) {
    const suffix = named[5].replace(/表格|单元格|条件区域|编号段落/g, part => ' · ' + contextSuffixes[part]);
    return `${named[1] === '样式' ? 'Style' : 'List'} “${named[2]}”${named[3] ? `, level ${named[3]}${named[4] ? ' override' : ''}` : ''}${suffix}`;
  }
  for (const prefix of ['文档默认字体', '文档默认段落']) {
    if (context.startsWith(prefix)) {
      const suffix = context.slice(prefix.length);
      if (/^(?:表格|单元格|条件区域|编号段落)*$/.test(suffix)) return diagnosticMessages[prefix] + suffix.replace(/表格|单元格|条件区域|编号段落/g, part => ' · ' + contextSuffixes[part]);
    }
  }
  return diagnosticMessages[context] ?? context;
}
// 只处理已知诊断的完整模式。插入的样式名、标识与文件内容保持原样。
export function translateDiagnostic(text: string, locale: Locale): string {
  if (locale === 'zh') return text;
  if (diagnosticMessages[text]) return diagnosticMessages[text];
  if (text.startsWith('方案格式不正确：')) {
    return diagnosticMessages['方案格式不正确：'] + text.slice('方案格式不正确：'.length).replaceAll('文本包含无效字符', 'Text contains invalid characters');
  }
  for (const {key, english, pattern} of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const values = match.slice(1);
    if (key.startsWith('{0}')) values[0] = contextLabel(values[0]);
    if (key === '文件内嵌方案无法恢复，已改为提取 Word 样式：{0}') values[0] = translateDiagnostic(values[0], locale);
    return english.replace(/\{(\d+)\}/g, (_, index: string) => values[Number(index)] ?? '');
  }
  return text;
}
