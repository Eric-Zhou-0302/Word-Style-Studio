import { Inflate, strFromU8 } from 'fflate';
import { createProject, createStyle, createList, validateProject, canBaseOn, paragraphStyle, numberFormats, regionNames, runSchema, paragraphSchema, borderSchema, tableDefault, type Project, type Style, type Run, type Paragraph, type Border, type Borders, type Table, type Level } from './model';
import type { Locale } from './i18n';

const MAX_INPUT = 10 * 1024 * 1024;
const MAX_EXPANDED = 40 * 1024 * 1024;
const MAX_ENTRIES = 2048;
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const WS = 'http://purl.oclc.org/ooxml/wordprocessingml/main';
const W14 = 'http://schemas.microsoft.com/office/word/2010/wordml';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const needed = new Set(['[Content_Types].xml', 'word/styles.xml', 'word/numbering.xml', 'word/settings.xml', 'word/document.xml', 'word/theme/theme1.xml', 'word/style-studio.json']);
export type ImportResult = { project: Project; warnings: string[] };

function safeName(name: string): boolean {
  return !!name && !name.includes('\\') && !name.includes('\0') && !name.startsWith('/') && !/^[A-Za-z]:/.test(name) && !name.split('/').some(p => p === '..' || p === '.');
}

// 先校验中央目录，再分块解压；实际输出同样受限，不能信任压缩包自报的大小。
function readArchive(bytes: Uint8Array): Map<string, Uint8Array> {
  if (bytes.length > MAX_INPUT) throw new Error('Word 文件不能超过 10 MB');
  if (bytes.length < 22) throw new Error('这不是有效的 DOCX / DOTX 压缩包');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  }
  if (end < 0) throw new Error('Word 文件压缩目录损坏');
  const count = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true), directoryStart = view.getUint32(end + 16, true);
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== count) throw new Error('不支持分卷 ZIP');
  if (count === 65535 || directorySize === 0xffffffff || directoryStart === 0xffffffff) throw new Error('不支持 ZIP64 文件');
  if (count > MAX_ENTRIES || directoryStart + directorySize !== end) throw new Error('压缩包目录异常或文件条目过多');
  const records: { name: string; offset: number; size: number; original: number; method: number; crc: number }[] = [];
  const names = new Set<string>(); let cursor = directoryStart, declared = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('压缩包中央目录不完整');
    const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true);
    const size = view.getUint32(cursor + 20, true), original = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true), extraLength = view.getUint16(cursor + 30, true), commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > end || view.getUint16(cursor + 34, true)) throw new Error('压缩包目录损坏');
    if (flags & 0x2041) throw new Error('不支持加密或隐藏目录的 Word 文件');
    if (method !== 0 && method !== 8) throw new Error('Word 文件使用了不支持的压缩方法');
    if (size === 0xffffffff || original === 0xffffffff || localOffset === 0xffffffff) throw new Error('不支持 ZIP64 文件');
    const name = strFromU8(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (!safeName(name) || names.has(name)) throw new Error('压缩包含有不安全路径或重复文件名');
    names.add(name); declared += original;
    if (declared > MAX_EXPANDED) throw new Error('Word 解压后不能超过 40 MB');
    if (localOffset + 30 > directoryStart || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('压缩包本地文件头损坏');
    const localFlags = view.getUint16(localOffset + 6, true), localMethod = view.getUint16(localOffset + 8, true);
    const localNameLength = view.getUint16(localOffset + 26, true), localExtraLength = view.getUint16(localOffset + 28, true);
    const offset = localOffset + 30 + localNameLength + localExtraLength;
    if (offset + size > directoryStart || localFlags !== flags || localMethod !== method || strFromU8(bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength)) !== name) throw new Error('压缩包文件头与中央目录不一致');
    if (!(flags & 8) && (view.getUint32(localOffset + 18, true) !== size || view.getUint32(localOffset + 22, true) !== original)) throw new Error('压缩包声明的文件大小不一致');
    records.push({ name, offset, size, original, method, crc: view.getUint32(cursor + 16, true) }); cursor = next;
  }
  if (cursor !== end) throw new Error('压缩包中央目录长度不正确');
  const ranges = records.map(r => [r.offset, r.offset + r.size]).sort((a, b) => a[0] - b[0]);
  if (ranges.some((r, i) => i > 0 && r[0] < ranges[i - 1][1])) throw new Error('压缩包条目相互重叠');
  const output = new Map<string, Uint8Array>(); let actual = 0;
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  for (const record of records) {
    const chunks: Uint8Array[] = []; let length = 0, crc = 0xffffffff;
    const accept = (chunk: Uint8Array) => {
      length += chunk.length; actual += chunk.length;
      if (length > record.original || actual > MAX_EXPANDED) throw new Error('解压数据超过声明大小或 40 MB 上限');
      for (const b of chunk) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
      if (needed.has(record.name)) chunks.push(chunk.slice());
    };
    const compressed = bytes.subarray(record.offset, record.offset + record.size);
    if (record.method === 0) accept(compressed);
    else {
      const inflater = new Inflate(accept);
      if (!compressed.length) throw new Error('压缩条目缺少数据');
      for (let p = 0; p < compressed.length; p += 4096) inflater.push(compressed.subarray(p, p + 4096), p + 4096 >= compressed.length);
    }
    if (length !== record.original || ((crc ^ 0xffffffff) >>> 0) !== record.crc) throw new Error('Word 文件内容校验失败，文件可能已损坏');
    if (needed.has(record.name)) { const buffer = new Uint8Array(length); let p = 0; for (const c of chunks) { buffer.set(c, p); p += c.length; } if (record.name.endsWith('.xml') && /<!\s*(?:DOCTYPE|ENTITY)\b/i.test(decode(buffer))) throw new Error('Word XML 包含禁止的 DTD 或实体定义'); output.set(record.name, buffer); }
  }
  return output;
}

function decode(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le', { fatal: true }).decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be', { fatal: true }).decode(bytes);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
function parseXml(bytes: Uint8Array | undefined, label: string): Document | undefined {
  if (!bytes) return;
  const xml = decode(bytes);
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw new Error(`${label} 包含禁止的 DTD 或实体定义`);
  if (typeof DOMParser === 'undefined') throw new Error('解析外部 Word 文件需要浏览器环境');
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length || document.getElementsByTagNameNS('*', 'parsererror').length) throw new Error(`${label} 不是有效的 XML`);
  return document;
}
function children(e: Element | Document | undefined, name?: string): Element[] {
  return e ? Array.from(e.children).filter(c => (!name || c.localName === name) && (c.namespaceURI === W || c.namespaceURI === WS || c.namespaceURI === W14)) : [];
}
function child(e: Element | Document | undefined, name: string): Element | undefined { return children(e, name)[0]; }
function attr(e: Element | undefined, name = 'val'): string | undefined { if (!e) return; return e.getAttributeNS(W, name) ?? e.getAttributeNS(WS, name) ?? e.getAttributeNS(W14, name) ?? e.getAttribute(`w:${name}`) ?? e.getAttribute(`w14:${name}`) ?? undefined; }
function val(e: Element | Document | undefined, name: string): string | undefined { return attr(child(e, name)); }
function bool(e: Element | undefined): boolean | undefined { return e ? !['0', 'false', 'off'].includes(attr(e) ?? '') : undefined; }
function number(v: string | undefined): number | undefined { if (v === undefined || !v.trim()) return; const n = Number(v); return Number.isFinite(n) ? n : undefined; }
const cm = (twips: number) => Math.round(twips / 1440 * 2.54 * 10000) / 10000;
const cleanText = (text: string) => text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 255);

class WordReader {
  warnings = new Set<string>();
  themes = new Map<string, string>();
  themeFonts = new Map<string, string>();
  warn(message: string) { this.warnings.add(message); }
  unknown(e: Element | undefined, supported: string[], context: string) {
    if (!e) return;
    const extra = Array.from(e.children).filter(c => !supported.includes(c.localName)).map(c => c.localName);
    if (extra.length) this.warn(`${context}：未支持的属性 ${[...new Set(extra)].join('、')} 未导入。`);
  }
  safeFields<T extends Run | Paragraph>(value: T, schema: typeof runSchema | typeof paragraphSchema, context: string): T {
    const parsed = schema.safeParse(value);
    if (parsed.success) return parsed.data as T;
    const copy = { ...value } as Record<string, unknown>;
    for (const issue of parsed.error.issues) { const field = String(issue.path[0]); delete copy[field]; this.warn(`${context}：${field} 超出可编辑范围，已省略。`); }
    return copy as T;
  }
  readTheme(document?: Document) {
    if (!document) return;
    for (const scheme of Array.from(document.getElementsByTagNameNS(A, 'clrScheme'))) {
      for (const c of Array.from(scheme.children)) { const color = c.firstElementChild; const hex = color?.getAttribute('val') ?? color?.getAttribute('lastClr'); if (hex && /^[0-9a-f]{6}$/i.test(hex)) this.themes.set(c.localName, `#${hex}`); else if (color?.getAttribute('lastClr')) this.themes.set(c.localName, '#' + color.getAttribute('lastClr')); }
    }
    for (const type of ['major', 'minor']) {
      const group = document.getElementsByTagNameNS(A, `${type}Font`)[0];
      if (!group) continue;
      const latin = group.getElementsByTagNameNS(A, 'latin')[0]?.getAttribute('typeface');
      const east = group.getElementsByTagNameNS(A, 'ea')[0]?.getAttribute('typeface') || Array.from(group.getElementsByTagNameNS(A, 'font')).find(x => x.getAttribute('script') === 'Hans')?.getAttribute('typeface');
      if (latin) { this.themeFonts.set(`${type}Ascii`, latin); this.themeFonts.set(`${type}HAnsi`, latin); }
      if (east) this.themeFonts.set(`${type}EastAsia`, east);
    }
  }
  color(e: Element | undefined, key = 'val', context = '颜色'): string | undefined {
    const raw = attr(e, key);
    const theme = attr(e, key === 'fill' ? 'themeFill' : 'themeColor');
    const mapping: Record<string, string> = { dark1:'dk1', light1:'lt1', dark2:'dk2', light2:'lt2', text1:'dk1', background1:'lt1', text2:'dk2', background2:'lt2', hyperlink:'hlink', followedHyperlink:'folHlink' };
    let result = theme ? this.themes.get(mapping[theme] ?? theme) : undefined;
    if (result) {
      this.warn('主题字体与主题颜色已转换为当前主题的固定值，导入后不再随 Word 主题变化。');
      const tint = attr(e, key === 'fill' ? 'themeFillTint' : 'themeTint'), shade = attr(e, key === 'fill' ? 'themeFillShade' : 'themeShade');
      const factor = (v?: string) => v && /^[0-9a-f]{2}$/i.test(v) ? parseInt(v, 16) / 255 : undefined;
      const t = factor(tint), s = factor(shade);
      if (t !== undefined || s !== undefined) result = '#' + [1,3,5].map(i => { let n = parseInt(result!.slice(i, i + 2), 16); if (s !== undefined) n *= s; if (t !== undefined) n = n * t + 255 * (1 - t); return Math.round(n).toString(16).padStart(2,'0'); }).join('');
    }
    if (!result && raw && /^[0-9a-f]{6}$/i.test(raw)) result = '#' + raw;
    if (!result && raw && raw !== 'auto' && raw !== 'none') this.warn(`${context}：无法解析颜色 ${raw}，保留继承值。`);
    if (!result && theme) this.warn(`${context}：主题色 ${theme} 无可用固定值，保留继承值。`);
    if (raw === 'auto') this.warn('Word 自动颜色以继承值代替，导入后请检查颜色。');
    return result;
  }
  run(e: Element | undefined, context: string, base: Run = {}, toggle = false): Run {
    const r: Run = {};
    if (!e) return r;
    const font = child(e, 'rFonts');
    if (font) {
      const east = attr(font, 'eastAsia'), latin = attr(font, 'ascii') ?? attr(font, 'hAnsi');
      const eastTheme = attr(font, 'eastAsiaTheme'), latinTheme = attr(font, 'asciiTheme') ?? attr(font, 'hAnsiTheme');
      const tf = (theme?: string) => theme ? this.themeFonts.get(theme) : undefined;
      if (eastTheme || latinTheme) this.warn('主题字体与主题颜色已转换为当前主题的固定值，导入后不再随 Word 主题变化。');
      if (east || tf(eastTheme)) r.font = cleanText(tf(eastTheme) ?? east!);
      if (latin || tf(latinTheme)) r.latinFont = cleanText(tf(latinTheme) ?? latin!);
      if (attr(font,'cs') && attr(font,'cs') !== latin) this.warn(`${context}：复杂文字字体未单独导入。`);
      if ((eastTheme && !tf(eastTheme) && !east) || (latinTheme && !tf(latinTheme) && !latin)) this.warn(`${context}：主题字体无法解析，保留继承值。`);
    }
    const mappings = { sz:['size',2], spacing:['spacing',20], w:['scale',1], position:['position',2], kern:['kerning',2] } as const;
    for (const [tag,[field,scale]] of Object.entries(mappings)) { const n = number(val(e,tag)); if (n !== undefined) (r as Record<string, unknown>)[field] = n / scale; }
    if (val(e,'szCs') && val(e,'szCs') !== val(e,'sz')) this.warn(`${context}：复杂文字字号未单独导入。`);
    const toggleFields = { b:'bold', i:'italic', caps:'caps', smallCaps:'smallCaps', outline:'outline', shadow:'shadow', emboss:'emboss', imprint:'imprint', vanish:'hidden' } as const;
    for (const [tag,key] of Object.entries(toggleFields)) { const v = bool(child(e,tag)); if (v !== undefined) (r as Record<string, unknown>)[key] = toggle ? (v ? !base[key] : (base[key] ?? false)) : v; }
    for (const [tag,key] of [['noProof','noProof'],['cntxtAlts','contextualAlternates']] as const) { const v = bool(child(e,tag)); if (v !== undefined) r[key] = v; }
    const strike = bool(child(e,'strike')), dstrike = bool(child(e,'dstrike'));
    if (strike !== undefined || dstrike !== undefined) {
      const single = strike === undefined ? base.strike === 'single' : toggle ? strike !== (base.strike === 'single') : strike;
      const double = dstrike === undefined ? base.strike === 'double' : dstrike;
      r.strike = double ? 'double' : single ? 'single' : 'none';
    }
    const enums: [string, keyof Run][] = [['u','underline'],['vertAlign','script'],['highlight','highlight'],['ligatures','ligatures'],['numForm','numForm'],['numSpacing','numSpacing']];
    for (const [tag,key] of enums) { const v = val(e,tag) ?? (tag==='u' && child(e,tag) ? 'single' : undefined); if (v !== undefined) (r as Record<string, unknown>)[key] = v; }
    const color = this.color(child(e,'color'), 'val',context); if (color) r.color = color;
    const uColor = this.color(child(e,'u'),'color',context); if (uColor) r.underlineColor = uColor;
    const shading = this.color(child(e,'shd'),'fill',context); if (shading) r.shading = shading;
    if (val(e,'shd') && !['clear','solid','nil'].includes(val(e,'shd')!)) this.warn(`${context}：底纹图案仅保留填充色。`);
    const lang = child(e,'lang'); if (lang) { const language = attr(lang,'eastAsia') ?? attr(lang); if (language) (r as Record<string, unknown>).language = language; }
    this.unknown(e,['rFonts','sz','szCs','color','b','bCs','i','iCs','caps','smallCaps','u','strike','dstrike','vertAlign','spacing','w','position','kern','highlight','vanish','lang','shd','outline','shadow','emboss','imprint','noProof','ligatures','numForm','numSpacing','cntxtAlts'],context);
    if ((child(e,'bCs') && bool(child(e,'bCs')) !== bool(child(e,'b'))) || (child(e,'iCs') && bool(child(e,'iCs')) !== bool(child(e,'i')))) this.warn(`${context}：复杂文字粗体或斜体未单独导入。`);
    return this.safeFields(r,runSchema,context);
  }
  borders(e: Element | undefined, context: string): Borders {
    const result: Borders = {};
    if (!e) return result;
    for (const b of children(e)) {
      const key = ({start:'left',end:'right'} as Record<string,string>)[b.localName] ?? b.localName;
      if (!['top','bottom','left','right','between','insideH','insideV'].includes(key)) { this.warn(`${context}：边框 ${b.localName} 未导入。`); continue; }
      const candidate = { style: attr(b) === 'nil' ? 'none' : attr(b) ?? 'single', color:this.color(b,'color',context) ?? '#000000', width:(number(attr(b,'sz')) ?? 4)/8, space:number(attr(b,'space')) ?? 0 };
      if (candidate.style === 'none') candidate.width = Math.max(0.25,candidate.width);
      const parsed = borderSchema.safeParse(candidate);
      if (parsed.success) (result as Record<string, Border>)[key] = parsed.data;
      else this.warn(`${context}：边框 ${b.localName} 的样式或尺寸不支持，已省略。`);
      if (attr(b,'shadow') || attr(b,'frame')) this.warn(`${context}：边框阴影与框架效果未导入。`);
    }
    return result;
  }
  paragraph(e: Element | undefined, context: string): Paragraph {
    const p: Paragraph = {}; if (!e) return p;
    const jc = val(e,'jc'); if (jc) (p as Record<string,unknown>).alignment = jc === 'start' ? 'left' : jc === 'end' ? 'right' : jc;
    const indent = child(e,'ind');
    if (indent) {
      const charKeys = ['leftChars','startChars','rightChars','endChars','firstLineChars','hangingChars'];
      const char = charKeys.some(k => (number(attr(indent,k))??0)!==0) || (!['left','start','right','end','firstLine','hanging'].some(k=>attr(indent,k)!==undefined) && charKeys.some(k=>attr(indent,k)!==undefined));
      p.indentUnit = char ? 'char' : 'cm';
      const convert = (v: number) => char ? v / 100 : cm(v);
      const read = (...keys: string[]) => keys.map(k => number(attr(indent,k))).find(v => v !== undefined);
      const left = read(...(char ? ['startChars','leftChars'] : ['start','left'])), right = read(...(char ? ['endChars','rightChars'] : ['end','right']));
      const first = read(char ? 'firstLineChars':'firstLine'), hanging = read(char ? 'hangingChars':'hanging');
      if (left !== undefined) p.left = convert(left); if (right !== undefined) p.right = convert(right);
      if (hanging !== undefined && hanging !== 0) p.firstLine = -convert(hanging); else if (first !== undefined) p.firstLine = convert(first); else if (hanging !== undefined) p.firstLine = 0;
      if (char && ((left === undefined && read('start','left') !== undefined) || (right === undefined && read('end','right') !== undefined) || (first === undefined && hanging === undefined && read('firstLine','hanging') !== undefined))) this.warn(`${context}：混合字符和厘米缩进仅保留字符单位部分。`);
    }
    const spacing = child(e,'spacing');
    if (spacing) {
      const lines = attr(spacing,'beforeLines') !== undefined || attr(spacing,'afterLines') !== undefined;
      p.spacingUnit = lines ? 'line' : 'pt';
      const before = number(attr(spacing,lines?'beforeLines':'before')), after = number(attr(spacing,lines?'afterLines':'after'));
      if (before !== undefined) p.before = before / (lines?100:20); if (after !== undefined) p.after = after / (lines?100:20);
      if (lines && ((before === undefined && attr(spacing,'before') !== undefined) || (after === undefined && attr(spacing,'after') !== undefined))) this.warn(`${context}：混合行和磅段间距仅保留行单位部分。`);
      for (const [key,field] of [['beforeAutospacing','beforeAuto'],['afterAutospacing','afterAuto']] as const) { const v = attr(spacing,key); if (v !== undefined) p[field] = !['0','false','off'].includes(v); }
      const line = number(attr(spacing,'line')); const rule = attr(spacing,'lineRule') ?? 'auto';
      if (line !== undefined) { p.lineRule = rule as Paragraph['lineRule']; p.line = line / (rule==='auto'?240:20); }
    }
    for (const tag of ['contextualSpacing','keepNext','keepLines','pageBreakBefore','widowControl','suppressLineNumbers','suppressAutoHyphens','snapToGrid','overflowPunct','autoSpaceDE','autoSpaceDN','kinsoku','wordWrap','mirrorIndents','bidi'] as const) { const v = bool(child(e,tag)); if (v !== undefined) p[tag] = v; }
    const textAlignment = val(e,'textAlignment'); if (textAlignment) p.textAlignment = textAlignment as Paragraph['textAlignment'];
    const outline = number(val(e,'outlineLvl')); if (outline !== undefined) p.outlineLevel = outline;
    const shading = this.color(child(e,'shd'),'fill',context); if (shading) p.shading = shading;
    if (val(e,'shd') && !['clear','solid','nil'].includes(val(e,'shd')!)) this.warn(`${context}：底纹图案仅保留填充色。`);
    if (child(e,'pBdr')) p.borders = this.borders(child(e,'pBdr'),context);
    if (child(e,'tabs')) {
      p.tabs = children(child(e,'tabs'),'tab').slice(0,64).map(tab => ({position:cm(number(attr(tab,'pos'))??0),alignment:(attr(tab)??'left') as NonNullable<Paragraph['tabs']>[number]['alignment'],leader:(attr(tab,'leader')??'none') as NonNullable<Paragraph['tabs']>[number]['leader']}));
      if (children(child(e,'tabs'),'tab').length>64) this.warn(`${context}：只导入前 64 个制表位。`);
    }
    this.unknown(e,['jc','ind','spacing','contextualSpacing','keepNext','keepLines','pageBreakBefore','widowControl','suppressLineNumbers','suppressAutoHyphens','snapToGrid','overflowPunct','autoSpaceDE','autoSpaceDN','kinsoku','wordWrap','mirrorIndents','bidi','textAlignment','outlineLvl','shd','pBdr','tabs','numPr'],context);
    return this.safeFields(p,paragraphSchema,context);
  }
  table(e: Element, context: string): Table {
    const t: Table = {...structuredClone(tableDefault),border:{style:'none',color:'#000000',width:0.5,space:0},shading:'#ffffff',verticalAlign:'top',regions:{}};
    const tbl = child(e,'tblPr'), tc = child(e,'tcPr');
    const alignment = val(tbl,'jc'); if (['left','center','right'].includes(alignment??'')) t.alignment = alignment as Table['alignment'];
    const margins = child(tc,'tcMar') ?? child(tbl,'tblCellMar');
    if (margins) {
      const values = children(margins).filter(x => !attr(x,'type') || attr(x,'type') === 'dxa').map(x => cm(number(attr(x,'w'))??0));
      if (values.length && values[0] >= 0 && values[0] <= 5) t.cellMargin = values[0];
      t.cellMargins={top:t.cellMargin,bottom:t.cellMargin,left:t.cellMargin,right:t.cellMargin};
      for(const side of ['top','bottom','left','right'] as const){
        const node=child(margins,side)??child(margins,side==='left'?'start':side==='right'?'end':side);
        const raw=number(attr(node,'w'));
        if(raw!==undefined&&(!attr(node,'type')||attr(node,'type')==='dxa')&&cm(raw)>=0&&cm(raw)<=5)t.cellMargins[side]=cm(raw);
      }
    }
    const spacing = number(attr(child(tbl,'tblCellSpacing'),'w')); if (spacing !== undefined && cm(spacing)>=0 && cm(spacing)<=5) t.cellSpacing = cm(spacing);
    for (const [tag,key] of [['tblStyleRowBandSize','rowBandSize'],['tblStyleColBandSize','colBandSize']] as const) { const n = number(val(tbl,tag)); if (n !== undefined && n>=1 && Number.isInteger(n)) {t[key] = Math.min(n,3);if(n>3)this.warn(`${context}：表格分组条带大小超过 Word 支持范围，已改为 3。`);} }
    const borders = this.borders(child(tc,'tcBorders')??child(tbl,'tblBorders'),context);
    const values = Object.values(borders); if (values.length) t.border = values[0]!;
    if (new Set(values.map(v=>JSON.stringify(v))).size>1) this.warn(`${context}：基础表格各边边框不同，统一采用第一项；条件区域边框保留独立设置。`);
    t.shading = this.color(child(tc,'shd')??child(tbl,'shd'),'fill',context) ?? t.shading;
    const v = val(tc,'vAlign'); if (['top','center','bottom'].includes(v??'')) t.verticalAlign = v as Table['verticalAlign'];
    this.unknown(tbl,['jc','tblCellMar','tblCellSpacing','tblStyleRowBandSize','tblStyleColBandSize','tblBorders','shd'],context+'表格');
    this.unknown(tc,['tcMar','tcBorders','shd','vAlign'],context+'单元格');
    if (child(e,'trPr')) this.warn(`${context}：表格行属性未导入。`);
    for (const region of children(e,'tblStylePr')) {
      const type = attr(region,'type'); if (!regionNames.includes(type as typeof regionNames[number])) { this.warn(`${context}：表格条件区域 ${type??'未知'} 未导入。`); continue; }
      const props = child(region,'tcPr'), borders = child(props,'tcBorders');
      const shade = this.color(child(props,'shd'),'fill',context), align = val(props,'vAlign');
      t.regions[type as typeof regionNames[number]] = {run:this.run(child(region,'rPr'),context+'条件区域'),paragraph:this.paragraph(child(region,'pPr'),context+'条件区域'),...(borders?{borders:this.borders(borders,context)}:{}),...(shade?{shading:shade}:{}),...(['top','center','bottom'].includes(align??'')?{verticalAlign:align as 'top'|'center'|'bottom'}:{})};
      this.unknown(props,['tcBorders','shd','vAlign'],context+'条件区域');
      this.unknown(region,['rPr','pPr','tcPr'],context+'条件区域');
    }
    return t;
  }
}

function allocateId(raw: string, used: Set<string>, prefix: string, reserveLinked = false): string {
  let stem = /^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(raw) ? raw : raw.replace(/[^A-Za-z0-9_]/g,'_').replace(/^[^A-Za-z]+/,'');
  stem = (stem || prefix).slice(0,reserveLinked?76:80);
  let result = stem, n = 1;
  while (used.has(result) || (reserveLinked && used.has(`${result}Char`))) { const suffix = `_${n++}`; result = stem.slice(0,(reserveLinked?76:80)-suffix.length)+suffix; }
  used.add(result); if (reserveLinked) used.add(`${result}Char`); return result;
}
function uniqueName(raw: string, names: Set<string>, fallback: string): string {
  const base = cleanText(raw).replaceAll(',', '，').trim() || fallback; let name = base, n = 2;
  while (names.has(name)) { const suffix = ` (${n++})`; name = base.slice(0,255-suffix.length)+suffix; }
  names.add(name); return name;
}
function importedProject(files: Map<string, Uint8Array>, fileName: string, locale: Locale): ImportResult {
  const en = locale === 'en';
  const reader = new WordReader();
  const types = parseXml(files.get('[Content_Types].xml'),'内容类型');
  if (!types || !files.has('word/document.xml')) throw new Error('压缩包不是受支持的 Word 文档（缺少主文档）');
  const styleDocument = parseXml(files.get('word/styles.xml'),'样式'), stylesRoot = styleDocument?.documentElement;
  if (!stylesRoot || stylesRoot.localName !== 'styles' || ![W,WS].includes(stylesRoot.namespaceURI??'')) throw new Error('Word 文档没有可读取的样式库');
  const numberingDocument = parseXml(files.get('word/numbering.xml'),'编号');
  const document = parseXml(files.get('word/document.xml'),'主文档')!;
  const settings = parseXml(files.get('word/settings.xml'),'设置');
  reader.readTheme(parseXml(files.get('word/theme/theme1.xml'),'主题'));
  reader.warn('外部 Word 导入仅提取可编辑的样式、多级列表和页面设置；正文、页眉页脚、批注、修订、宏和其他文档内容不会保留。导出的是空白文档。');
  reader.warn('外部 Word 导入不是无损转换：请先查看本报告，并在 Word 中核对样式继承、编号和版面。');
  if (child(stylesRoot,'latentStyles')) reader.warn('Word 潜在样式目录不作为用户样式导入，仅提取 styles.xml 中实际定义的样式。');
  const rawStyles = new Map<string, Element>();
  for (const node of children(stylesRoot,'style')) {
    const id = attr(node,'styleId'); if (!id) { reader.warn('忽略了没有标识的样式。'); continue; }
    if (rawStyles.has(id)) throw new Error(`Word 存在重复的样式标识：${cleanText(id)}`);
    rawStyles.set(id,node);
  }
  const defaultNode = [...rawStyles.values()].find(n=>attr(n,'type')==='paragraph' && boolAttr(n,'default')) ?? rawStyles.get('Normal');
  const normalRaw = defaultNode && attr(defaultNode,'type') !== 'character' && attr(defaultNode,'type') !== 'table' ? attr(defaultNode,'styleId') : undefined;
  const charToParagraph = new Map<string,string>();
  for (const [id,node] of rawStyles) {
    if ((attr(node,'type')??'paragraph') !== 'paragraph' || id===normalRaw) continue;
    const linked = val(node,'link'), linkedNode = linked ? rawStyles.get(linked) : undefined;
    if (linked && linkedNode && attr(linkedNode,'type') === 'character' && val(linkedNode,'link') === id) charToParagraph.set(linked,id);
    else if (linked) reader.warn(`样式“${val(node,'name')??id}”的链接样式不成对，按普通段落样式导入。`);
  }
  const used = new Set<string>(['Normal']), names = new Set<string>(), idMap = new Map<string,string>();
  const sourceMap = new Map<string,Element>();
  const project = createProject(locale); project.name = cleanText(fileName.replace(/\.(docx|dotx)$/i,'')) || (en ? 'Imported Word Styles' : '导入的 Word 样式'); project.styles = []; project.lists = [];project.page={size:'A4',orientation:'portrait',top:2.54,bottom:2.54,left:2.54,right:2.54,gutter:0,defaultTab:1.27,header:1.27,footer:1.27};
  const defaults = child(stylesRoot,'docDefaults');
  const defaultRun = reader.run(child(child(defaults,'rPrDefault'),'rPr'),'文档默认字体');
  const defaultParagraph = reader.paragraph(child(child(defaults,'pPrDefault'),'pPr'),'文档默认段落');
  const normal = {...createStyle('paragraph',en ? 'Normal' : '正文'),id:'Normal',run:defaultRun,paragraph:defaultParagraph,next:'Normal',priority:0};
  if (!normalRaw) { project.styles.push(normal); names.add(normal.name); reader.warn('源文档没有默认段落样式，已补入正文（Normal）样式。'); }
  const candidates = [...rawStyles.entries()].filter(([id,node]) => !charToParagraph.has(id) && ['paragraph','character','table'].includes(attr(node,'type')??'paragraph'));
  candidates.sort(([a],[b])=>a===normalRaw?-1:b===normalRaw?1:0);
  if (candidates.length+(normalRaw?0:1)>200) reader.warn('源文档超过 200 个可编辑样式，仅导入前 200 个（优先保留默认段落样式）。');
  for (const [rawId,node] of candidates.slice(0,200-project.styles.length)) {
    const linked = [...charToParagraph.values()].includes(rawId);
    const type = rawId===normalRaw ? 'paragraph' : linked ? 'linked' : (attr(node,'type')??'paragraph') as Style['type'];
    const id = rawId===normalRaw?'Normal':allocateId(rawId,used,'ImportedStyle',type==='linked');
    idMap.set(rawId,id);
    const sourceName = val(node,'name')??rawId;
    if(sourceName.includes(','))reader.warn('样式或列表名称中的英文逗号已转换为中文逗号，以满足 Word 名称约束。');
    const name = uniqueName(sourceName,names,en ? 'Imported Style' : '导入样式');
    const style: Style = {id,name,type,quickFormat:bool(child(node,'qFormat'))??false,priority:Math.max(0,Math.min(99,Math.trunc(number(val(node,'uiPriority'))??99))),hidden:bool(child(node,'semiHidden'))??bool(child(node,'hidden'))??false,unhideWhenUsed:bool(child(node,'unhideWhenUsed'))??false,autoUpdate:bool(child(node,'autoRedefine'))??false,aliases:cleanText(val(node,'aliases')??''),run:{},paragraph:{}};
    project.styles.push(style); sourceMap.set(id,node);
    reader.unknown(node,['name','basedOn','next','link','aliases','qFormat','uiPriority','semiHidden','hidden','unhideWhenUsed','autoRedefine','rPr','pPr','tblPr','tcPr','trPr','tblStylePr'],`样式“${name}”`);
  }
  for (const [raw,para] of charToParagraph) { const mapped = idMap.get(para); if (mapped) idMap.set(raw,mapped); }
  const styleMap = new Map(project.styles.map(s=>[s.id,s]));
  for (const style of project.styles) {
    const node = sourceMap.get(style.id); if (!node) continue;
    const rawBase = val(node,'basedOn'), base = rawBase ? idMap.get(rawBase) : undefined;
    if (base && base!==style.id) style.basedOn = base;
    else if (rawBase) reader.warn(`样式“${style.name}”的基准样式无法保留，将提取可解析的格式。`);
    const nextRaw = val(node,'next'), next = nextRaw ? idMap.get(nextRaw) : undefined;
    if (next && paragraphStyle(styleMap.get(next)!)) style.next = next;
    else if (nextRaw) { if (paragraphStyle(style)) style.next='Normal'; reader.warn(`样式“${style.name}”的后续段落样式不存在，已使用正文。`); }
  }
  const runCache = new Map<string,Run>(), paragraphCache = new Map<string,Paragraph>();
  const effectiveRaw = (raw: string, visiting = new Set<string>()): {run:Run;paragraph:Paragraph} => {
    if (runCache.has(raw)) return {run:runCache.get(raw)!,paragraph:paragraphCache.get(raw)!};
    if (visiting.has(raw) || visiting.size>200) { reader.warn('源样式存在循环或过深继承，已在循环处中断。'); return {run:{...defaultRun},paragraph:{...defaultParagraph}}; }
    const node = rawStyles.get(raw); if (!node) return {run:{...defaultRun},paragraph:{...defaultParagraph}};
    const nextVisit = new Set(visiting); nextVisit.add(raw);
    const basedOn = val(node,'basedOn'), base = basedOn ? effectiveRaw(basedOn,nextVisit) : {run:{...defaultRun},paragraph:{...defaultParagraph}};
    const context=`样式“${val(node,'name')??raw}”`;
    const result = {run:{...base.run,...reader.run(child(node,'rPr'),context,base.run,attr(node,'type')!=='table')},paragraph:{...base.paragraph,...reader.paragraph(child(node,'pPr'),context)}};
    runCache.set(raw,result.run); paragraphCache.set(raw,result.paragraph); return result;
  };
  for (const style of project.styles) {
    const node = sourceMap.get(style.id); if (!node) continue;
    const raw = attr(node,'styleId')!, rawBase = val(node,'basedOn');
    const base = rawBase ? effectiveRaw(rawBase) : {run:defaultRun,paragraph:defaultParagraph};
    const context=`样式“${style.name}”`;
    style.run=reader.run(child(node,'rPr'),context,base.run,attr(node,'type')!=='table'); style.paragraph=style.type==='character'?{}:reader.paragraph(child(node,'pPr'),context);
    if (style.id==='Normal') {
      const effective=effectiveRaw(raw); style.run=effective.run;style.paragraph=effective.paragraph;delete style.basedOn;
      if (rawBase) reader.warn('默认段落样式的继承已展开为固定格式，以保证正文样式可独立使用。');
    } else if (!style.basedOn || !canBaseOn(project,style,styleMap.get(style.basedOn)!)) {
      if (rawBase) {const effective=effectiveRaw(raw);style.run=effective.run;if(style.type!=='character')style.paragraph=effective.paragraph;reader.warn(`${context}的继承类型不兼容、存在循环或目标缺失，已展开格式。`);}
      else if(style.type!=='character') { style.run={...defaultRun,...style.run};style.paragraph={...defaultParagraph,...style.paragraph}; }
      delete style.basedOn;
    }
    if (style.type==='linked') {
      const linkedRaw = val(node,'link'), linkedNode = linkedRaw ? rawStyles.get(linkedRaw) : undefined;
      if (linkedNode && linkedRaw) {
        const charRun = effectiveRaw(linkedRaw).run, paragraphRun = effectiveRaw(raw).run;
        if (JSON.stringify(charRun)!==JSON.stringify(paragraphRun)) reader.warn(`${context}的段落和字符部分格式不同，合并后采用段落部分格式。`);
      }
    }
    if (style.type==='table') style.table=reader.table(node,context);
  }
  // 对前面展开继承时改变的关系做最终检查，避免遗漏间接循环。
  for (const style of project.styles) if (style.basedOn && !canBaseOn(project,style,styleMap.get(style.basedOn)!)) { const raw=attr(sourceMap.get(style.id),'styleId'); if(raw){const v=effectiveRaw(raw);style.run=v.run;if(style.type!=='character')style.paragraph=v.paragraph;}delete style.basedOn;reader.warn(`样式“${style.name}”的循环继承已展开。`); }

  const abstractNodes = new Map<string,Element>(), numNodes = new Map<string,Element>();
  for (const n of children(numberingDocument?.documentElement,'abstractNum')) { const id=attr(n,'abstractNumId');if(id!==undefined)abstractNodes.set(id,n); }
  for (const n of children(numberingDocument?.documentElement,'num')) { const id=attr(n,'numId');if(id!==undefined)numNodes.set(id,n); }
  const resolveAbstract = (id:string,seen=new Set<string>()):Element|undefined=>{
    if(seen.has(id)){reader.warn('列表样式关联存在循环，相关定义未导入。');return;}
    const node=abstractNodes.get(id);if(!node)return;
    const link=val(node,'numStyleLink');if(!link)return node;
    const style=rawStyles.get(link),numId=val(child(child(style,'pPr'),'numPr'),'numId'),num=numId?numNodes.get(numId):undefined;
    const target=val(num,'abstractNumId');if(target===undefined){reader.warn(`列表样式关联 ${link} 无法解析。`);return;}
    const next=new Set(seen);next.add(id);return resolveAbstract(target,next);
  };
  const readLevel = (node:Element|undefined,index:number,base:Level,context:string):Level=>{
    const result=structuredClone(base); if(!node)return result;
    const format=val(node,'numFmt');if(format!==undefined){if(numberFormats.includes(format as Level['format']))result.format=format as Level['format'];else reader.warn(`${context}：编号格式 ${format} 不受支持，使用十进制数字。`);}
    if(attr(child(node,'numFmt'),'format'))reader.warn(`${context}：自定义编号格式字符串未导入。`);
    const text=val(node,'lvlText');if(text!==undefined){result.text=cleanText(text)||' ';if([...result.text.matchAll(/%([0-9]+)/g)].some(m=>Number(m[1])<1||Number(m[1])>index+1)){reader.warn(`${context}：编号文本含无效层级引用，已使用本级编号。`);result.text=`%${index+1}`;}}
    const start=number(val(node,'start'));if(start!==undefined){if(Number.isInteger(start)&&start>=0&&start<=32767)result.start=start;else reader.warn(`${context}：起始编号超出范围，采用默认值。`);}
    const restart=number(val(node,'lvlRestart'));if(restart!==undefined){if(Number.isInteger(restart)&&restart>=0&&restart<=index)result.restart=restart;else reader.warn(`${context}：重启层级无效，采用默认规则。`);}
    const legal=bool(child(node,'isLgl'));if(legal!==undefined)result.legal=legal;
    const alignment=val(node,'lvlJc');if(['left','center','right'].includes(alignment??''))result.alignment=alignment as Level['alignment'];
    const follow=val(node,'suff');if(['tab','space','nothing'].includes(follow??''))result.follow=follow as Level['follow'];
    const props=child(node,'pPr'),ind=child(props,'ind');
    const left=number(attr(ind,'start')??attr(ind,'left')),hanging=number(attr(ind,'hanging')),firstLine=number(attr(ind,'firstLine'));
    if(left!==undefined&&cm(left)>=0&&cm(left)<=55)result.indent=cm(left);
    if(hanging!==undefined&&hanging!==0&&cm(hanging)>=-20&&cm(hanging)<=55)result.hanging=cm(hanging);else if(firstLine!==undefined&&-cm(firstLine)>=-20&&-cm(firstLine)<=55)result.hanging=-cm(firstLine);else if(hanging===0)result.hanging=0;
    if(ind&&['leftChars','startChars','hangingChars','firstLineChars'].some(k=>attr(ind,k)!==undefined))reader.warn(`${context}：列表层级的字符单位缩进未导入，保留厘米缩进。`);
    const tabs=children(child(props,'tabs'),'tab'),tab=tabs.find(t=>attr(t)==='num')??tabs.find(t=>attr(t)!=='clear');
    const pos=number(attr(tab,'pos'));if(pos!==undefined&&cm(pos)>=0&&cm(pos)<=55)result.tabPosition=cm(pos);else if(left!==undefined)result.tabPosition=result.indent;
    if(tabs.length>1)reader.warn(`${context}：仅保留编号后的一个制表位。`);
    result.run={...result.run,...reader.run(child(node,'rPr'),context)};
    const rawStyle=val(node,'pStyle'),mapped=rawStyle?idMap.get(rawStyle):undefined;
    if(mapped&&paragraphStyle(styleMap.get(mapped)!))result.linkedStyle=mapped;else if(rawStyle)reader.warn(`${context}：关联段落样式 ${rawStyle} 无法导入。`);
    if(child(node,'lvlPicBulletId'))reader.warn(`${context}：外部图片项目符号未导入，保留文字项目符号；本应用导出的图片符号可通过内嵌方案完整恢复。`);
    reader.unknown(node,['start','numFmt','lvlRestart','pStyle','isLgl','suff','lvlText','lvlJc','pPr','rPr','lvlPicBulletId'],context);
    reader.unknown(props,['ind','tabs'],context+'编号段落');return result;
  };
  const importedNumToList = new Map<string,string>(), importedAbstract = new Set<string>(), listNames=new Set<string>(), listOrigins=new Map<string,string>();
  const readList=(abstractId:string,instance:Element|undefined,numId?:string)=>{
    const abstract=resolveAbstract(abstractId);if(!abstract)return;
    const id=attr(abstract,'abstractNumId')??abstractId;
    const explicitName=val(abstract,'name'),styleLink=val(abstract,'styleLink'),styleName=styleLink?val(rawStyles.get(styleLink),'name'):undefined;
    const sourceName=styleName??explicitName??`${en ? 'Multilevel List' : '多级列表'} ${project.lists.length+1}`;
    if(sourceName.includes(','))reader.warn('样式或列表名称中的英文逗号已转换为中文逗号，以满足 Word 名称约束。');
    const list=createList(uniqueName(sourceName,listNames,en ? 'Imported Multilevel List' : '导入多级列表'));
    list.id=allocateId(`List_${numId??'Abstract_'+abstractId}`,used,'ImportedList');
    if(explicitName)list.listNumName=cleanText(explicitName);
    const galleryLevel=number(val(child(child(styleLink?rawStyles.get(styleLink):undefined,'pPr'),'numPr'),'ilvl'));if(galleryLevel!==undefined&&Number.isInteger(galleryLevel)&&galleryLevel>=0&&galleryLevel<=8)list.galleryLevel=galleryLevel;
    const levelNodes=children(abstract,'lvl');

    for(const level of levelNodes){const index=number(attr(level,'ilvl'));if(index===undefined||!Number.isInteger(index)||index<0||index>8){reader.warn(`列表“${list.name}”：忽略无效层级。`);continue;}list.levels[index]=readLevel(level,index,list.levels[index],`列表“${list.name}”第 ${index+1} 级`);}
    if(instance)for(const override of children(instance,'lvlOverride')){const index=number(attr(override,'ilvl'));if(index===undefined||!Number.isInteger(index)||index<0||index>8){reader.warn(`列表“${list.name}”：忽略无效的层级覆盖。`);continue;}list.levels[index]=readLevel(child(override,'lvl'),index,list.levels[index],`列表“${list.name}”第 ${index+1} 级覆盖`);const start=number(val(override,'startOverride'));if(start!==undefined&&Number.isInteger(start)&&start>=0&&start<=32767)list.levels[index].start=start;}
    if(val(abstract,'multiLevelType')==='singleLevel'&&levelNodes.every(l=>attr(l,'ilvl')==='0')&&(!instance||children(instance,'lvlOverride').every(l=>attr(l,'ilvl')==='0'))&&list.levels[0].format!=='none'){list.kind=list.levels[0].format==='bullet'?'bullet':'numbered';list.levels=list.levels.slice(0,1);list.galleryLevel=0;}
    reader.unknown(abstract,['nsid','multiLevelType','tmpl','name','styleLink','numStyleLink','lvl'],`列表“${list.name}”`);
    const same=project.lists.find(l=>listOrigins.get(l.id)===id&&JSON.stringify(l.levels)===JSON.stringify(list.levels)&&l.listNumName===list.listNumName&&l.galleryLevel===list.galleryLevel);
    if(same){if(numId)importedNumToList.set(numId,same.id);listNames.delete(list.name);importedAbstract.add(id);return;}
    if(project.lists.length>=30){reader.warn('源文档超过 30 个不同的多级列表，仅导入前 30 个。');return;}
    if(list.levels.length===9&&levelNodes.length<9)reader.warn(`列表“${list.name}”未定义满九级，缺失层级已用默认值补齐。`);
    project.lists.push(list);listOrigins.set(list.id,id);importedAbstract.add(id);if(numId)importedNumToList.set(numId,list.id);
  };
  for(const [numId,num] of numNodes){if(numId==='0')continue;const aid=val(num,'abstractNumId');if(aid!==undefined)readList(aid,num,numId);}
  for(const [aid,abstract] of abstractNodes)if(!importedAbstract.has(aid)&&!val(abstract,'numStyleLink'))readList(aid,undefined);
  const styleNum = new Map<string,{listId:string;level:number}>();
  for(const style of project.styles){if(!paragraphStyle(style))continue;let node=sourceMap.get(style.id);const seen=new Set<Element>();while(node&&!seen.has(node)){seen.add(node);const props=child(child(node,'pPr'),'numPr'),num=val(props,'numId');if(num!==undefined){if(num!=='0'){const listId=importedNumToList.get(num);if(listId){const list=project.lists.find(l=>l.id===listId)!;const declared=list.levels.findIndex(l=>l.linkedStyle===style.id);const ilvl=number(val(props,'ilvl'));styleNum.set(style.id,{listId,level:declared>=0?declared:0});if(declared<0&&ilvl!==undefined&&ilvl!==0)reader.warn(`样式“${style.name}”：段落样式中的 ilvl 按 Word 规则不作为层级依据；缺少 pStyle 关联，按第 1 级导入。`);}else reader.warn(`样式“${style.name}”的编号定义未能导入。`);}break;}const base=val(node,'basedOn');node=base?rawStyles.get(base):undefined;}}
  const bound=new Set<string>();
  for(const list of project.lists)list.levels.forEach(level=>{if(!level.linkedStyle)return;const intended=styleNum.get(level.linkedStyle);if((intended&&intended.listId!==list.id)||bound.has(level.linkedStyle)){reader.warn(`样式“${styleMap.get(level.linkedStyle)?.name??level.linkedStyle}”关联多个列表，已保留一个有效关联。`);delete level.linkedStyle;}else bound.add(level.linkedStyle);});
  for(const [styleId,reference] of styleNum){if(bound.has(styleId))continue;const level=project.lists.find(l=>l.id===reference.listId)?.levels[reference.level];if(!level)continue;if(!level.linkedStyle){level.linkedStyle=styleId;bound.add(styleId);}else reader.warn(`样式“${styleMap.get(styleId)?.name??styleId}”与其他样式共享编号层级；当前模型每级只绑定一个样式，已保留原关联。`);}
  if([...rawStyles.values()].some(n=>attr(n,'type')==='numbering'))reader.warn('Word 编号样式已解析为多级列表定义，不作为单独的段落或字符样式导入。');
  for(const node of rawStyles.values()){const type=attr(node,'type')??'paragraph';if(!['paragraph','character','table','numbering'].includes(type))reader.warn(`样式类型 ${type} 未导入。`);}
  const sects=Array.from(document.getElementsByTagNameNS('*','sectPr')).filter(e=>[W,WS].includes(e.namespaceURI??''));
  if(sects.length>1)reader.warn('源文档包含多个节，仅采用最后一节的页面大小和页边距。');
  const section=sects.at(-1),size=child(section,'pgSz');
  const width=number(attr(size,'w')),height=number(attr(size,'h'));
  if(width&&height){const landscape=attr(size,'orient')==='landscape'||width>height;project.page.orientation=landscape?'landscape':'portrait';const dims=[width,height].sort((a,b)=>a-b);const sizes=[['A4',11906,16838],['A5',8391,11906],['Letter',12240,15840]] as const;const match=sizes.find(([,w,h])=>Math.abs(w-dims[0])<40&&Math.abs(h-dims[1])<40);if(match)project.page.size=match[0];else reader.warn('源文档使用自定义纸张尺寸，已采用 A4；请检查页面设置。');}
  const margins=child(section,'pgMar');
  for(const key of ['top','bottom','left','right','gutter','header','footer'] as const){const value=number(attr(margins,key));if(value!==undefined){const valueCm=cm(value);if(valueCm>=0&&valueCm<=(key==='gutter'?5:10))project.page[key]=valueCm;else reader.warn(`页面 ${key} 边距超出支持范围，保留默认值。`);}}
  const defaultTab=number(val(settings?.documentElement,'defaultTabStop'));if(defaultTab!==undefined&&cm(defaultTab)>=0.1&&cm(defaultTab)<=10)project.page.defaultTab=cm(defaultTab);
  if(section){const ignored=children(section).filter(e=>!['pgSz','pgMar','type'].includes(e.localName));if(ignored.length)reader.warn(`页面设置 ${[...new Set(ignored.map(e=>e.localName))].join('、')} 未导入。`);}
  const pageSize=project.page.size==='A4'?[21,29.7]:project.page.size==='A5'?[14.8,21]:[21.59,27.94];if(project.page.orientation==='landscape')pageSize.reverse();
  if(project.page.left+project.page.right+project.page.gutter>=pageSize[0]-1||project.page.top+project.page.bottom>=pageSize[1]-1){Object.assign(project.page,{top:2.54,bottom:2.54,left:2.54,right:2.54,gutter:0});reader.warn('导入页边距无法容纳正文，已恢复为 2.54 厘米。');}
  return {project:validateProject(project),warnings:[...reader.warnings]};
}
function boolAttr(e:Element,key:string){const value=attr(e,key);return value!==undefined&&!['0','false','off'].includes(value);}

export function importWord(bytes: Uint8Array, fileName?: string, locale: Locale = 'zh'): ImportResult {
  const sourceName = fileName ?? (locale === 'en' ? 'Imported Word Styles.docx' : '导入的 Word 样式.docx');
  const files = readArchive(bytes);
  const embedded=files.get('word/style-studio.json');
  if(embedded){
    try{return{project:validateProject(JSON.parse(decode(embedded))),warnings:['已从文件中恢复本应用嵌入的完整方案；若此文件后来在 Word 中修改过样式，嵌入方案可能与 Word 当前样式不同。正文不会导入。']};}
    catch(error){const imported=importedProject(files,sourceName,locale);imported.warnings.unshift(`文件内嵌方案无法恢复，已改为提取 Word 样式：${error instanceof Error?error.message:'方案无效'}`);return imported;}
  }
  return importedProject(files,sourceName,locale);
}
export async function importFile(file: File, locale: Locale = 'zh'): Promise<ImportResult> {
  if(file.size>MAX_INPUT)throw new Error('导入文件不能超过 10 MB');
  if(/\.json$/i.test(file.name)){
    let parsed:unknown;try{parsed=JSON.parse(await file.text());}catch{throw new Error('JSON 文件无法解析，请使用导出的方案备份。');}
    return{project:validateProject(parsed),warnings:['已读取完整 JSON 方案。确认应用后将替换当前编辑方案；可以通过撤销恢复。']};
  }
  if(!/\.(docx|dotx)$/i.test(file.name))throw new Error('请选择 .docx、.dotx 或本应用的 .json 方案文件');
  return importWord(new Uint8Array(await file.arrayBuffer()),file.name,locale);
}
