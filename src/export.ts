import { strToU8, zipSync } from 'fflate';
import { baseParagraph, baseRun, paragraphStyle, regionNames, resolveStyle, validateProject } from './model';
import type { Border, Borders, Level, Paragraph, Project, Run, Style, Table } from './model';

export interface ExportOptions { format?: 'docx' | 'dotx'; sample?: boolean }
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = `xmlns:w="${W}" xmlns:r="${R}" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="w14"`;
const escape = (value: string | number) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;').replaceAll('\n', '&#10;').replaceAll('\r', '&#13;').replaceAll('\t', '&#9;');
const attrs = (values: Record<string, string | number | undefined>) => Object.entries(values).filter(([, value]) => value !== undefined).map(([key, value]) => ` ${key}="${escape(value!)}"`).join('');
const leaf = (tag: string, values: Record<string, string | number | undefined> = {}) => `<${tag}${attrs(values)}/>`;
const val = (tag: string, value: string | number | undefined) => value === undefined ? '' : leaf(`w:${tag}`, { 'w:val': value });
const bool = (tag: string, value: boolean | undefined) => value === undefined ? '' : val(tag, value ? 1 : 0);
const cm = (value: number) => Math.round(value * 1440 / 2.54);
const pt = (value: number) => Math.round(value * 20);
const hex = (value: string | undefined) => value?.slice(1).toUpperCase();
const wrap = (tag: string, body: string) => body ? `<w:${tag}>${body}</w:${tag}>` : '';
const shade = (value: string | undefined) => value === undefined ? '' : leaf('w:shd', { 'w:val': 'clear', 'w:color': 'auto', 'w:fill': hex(value) });

/** 样式中的 true 是反转继承值，正文/编号中的 true 则是直接启用。 */
function runProperties(run: Run, inherited: Run = baseRun, style = false, allowHighlight = false): string {
  const toggle = (tag: string, value: boolean | undefined, parent: boolean | undefined) => bool(tag, value === undefined ? undefined : style ? value !== !!parent : value);
  let xml = '';
  if (run.font !== undefined || run.latinFont !== undefined) xml += leaf('w:rFonts', {
    'w:ascii': run.latinFont, 'w:hAnsi': run.latinFont, 'w:eastAsia': run.font, 'w:cs': run.latinFont,
  });
  xml += toggle('b', run.bold, inherited.bold) + toggle('bCs', run.bold, inherited.bold);
  xml += toggle('i', run.italic, inherited.italic) + toggle('iCs', run.italic, inherited.italic);
  xml += toggle('caps', run.caps, inherited.caps) + toggle('smallCaps', run.smallCaps, inherited.smallCaps);
  if (run.strike !== undefined) {
    xml += toggle('strike', run.strike === 'single', inherited.strike === 'single');
    xml += bool('dstrike', run.strike === 'double');
  }
  for (const key of ['outline', 'shadow', 'emboss', 'imprint'] as const) xml += toggle(key, run[key], inherited[key]);
  xml += bool('noProof', run.noProof) + toggle('vanish', run.hidden, inherited.hidden);
  xml += val('color', hex(run.color));
  xml += val('spacing', run.spacing === undefined ? undefined : pt(run.spacing));
  xml += val('w', run.scale === undefined ? undefined : Math.round(run.scale));
  xml += val('kern', run.kerning === undefined ? undefined : Math.round(run.kerning * 2));
  xml += val('position', run.position === undefined ? undefined : Math.round(run.position * 2));
  xml += val('sz', run.size === undefined ? undefined : Math.round(run.size * 2));
  xml += val('szCs', run.size === undefined ? undefined : Math.round(run.size * 2));
  // 高亮仅允许用于正文运行属性；样式及编号的 CT_RPr 不支持该元素。
  if (allowHighlight) xml += val('highlight', run.highlight);
  if (run.underline !== undefined || run.underlineColor !== undefined) xml += leaf('w:u', { 'w:val': run.underline ?? inherited.underline ?? 'none', 'w:color': hex(run.underlineColor) });
  xml += shade(run.shading) + val('vertAlign', run.script);
  if (run.language !== undefined) xml += leaf('w:lang', { 'w:val': run.language, 'w:eastAsia': run.language });
  for (const key of ['ligatures', 'numForm', 'numSpacing'] as const) if (run[key] !== undefined) xml += leaf(`w14:${key}`, { 'w14:val': run[key] });
  if (run.contextualAlternates !== undefined) xml += leaf('w14:cntxtAlts', { 'w14:val': run.contextualAlternates ? 1 : 0 });
  return wrap('rPr', xml);
}

function border(tag: string, item: Border): string {
  return leaf(`w:${tag}`, { 'w:val': item.style, 'w:sz': Math.round(item.width * 8), 'w:space': Math.round(item.space), 'w:color': hex(item.color) });
}
function borders(items: Borders | undefined, type: 'pBdr' | 'tblBorders' | 'tcBorders'): string {
  if (!items) return '';
  const keys: (keyof Borders)[] = type === 'pBdr' ? ['top', 'left', 'bottom', 'right', 'between'] : ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'];
  return wrap(type, keys.map(key => items[key] ? border(key, items[key]!) : '').join(''));
}

function paragraphProperties(p: Paragraph, inherited: Paragraph = baseParagraph, numbering = '', styleId?: string): string {
  const effective = { ...inherited, ...p };
  let xml = val('pStyle', styleId);
  for (const key of ['keepNext', 'keepLines', 'pageBreakBefore', 'widowControl'] as const) xml += bool(key, p[key]);
  xml += numbering + bool('suppressLineNumbers', p.suppressLineNumbers) + borders(p.borders, 'pBdr') + shade(p.shading);
  if (p.tabs?.length) xml += wrap('tabs', [...p.tabs].sort((a, b) => a.position - b.position).map(tab => leaf('w:tab', { 'w:val': tab.alignment, 'w:leader': tab.leader, 'w:pos': cm(tab.position) })).join(''));
  for (const key of ['suppressAutoHyphens', 'kinsoku', 'wordWrap', 'overflowPunct', 'autoSpaceDE', 'autoSpaceDN', 'bidi', 'snapToGrid'] as const) xml += bool(key, p[key]);
  const spacing: Record<string, string | number | undefined> = {};
  for (const key of ['before', 'after'] as const) {
    const amount = p[key] ?? (p.spacingUnit !== undefined ? effective[key] : undefined);
    if (amount !== undefined) {
      // 清掉互斥单位，避免父样式中的字符/行单位优先级覆盖当前值。
      spacing[`w:${key}`] = effective.spacingUnit === 'line' ? 0 : pt(amount);
      spacing[`w:${key}Lines`] = effective.spacingUnit === 'line' ? Math.round(amount * 100) : 0;
    }
    if (p[`${key}Auto`] !== undefined) spacing[`w:${key}Autospacing`] = p[`${key}Auto`] ? 1 : 0;
  }
  if (p.line !== undefined || p.lineRule !== undefined) {
    spacing['w:line'] = Math.round((effective.line ?? 1.5) * (effective.lineRule === 'auto' ? 240 : 20));
    spacing['w:lineRule'] = effective.lineRule ?? 'auto';
  }
  if (Object.keys(spacing).length) xml += leaf('w:spacing', spacing);
  const indent: Record<string, number> = {};
  for (const key of ['left', 'right', 'firstLine'] as const) {
    const amount = p[key] ?? (p.indentUnit !== undefined ? effective[key] : undefined);
    if (amount === undefined) continue;
    if (key === 'firstLine') {
      const direction = amount < 0 ? 'hanging' : 'firstLine';
      // firstLine 与 hanging 不能同时出现，否则 hanging 会压过首行缩进。
      indent['w:firstLineChars'] = 0; indent['w:hangingChars'] = 0;
      indent[`w:${direction}${effective.indentUnit === 'char' ? 'Chars' : ''}`] = effective.indentUnit === 'char' ? Math.round(Math.abs(amount) * 100) : cm(Math.abs(amount));
    } else {
      indent[`w:${key}`] = effective.indentUnit === 'char' ? 0 : cm(amount);
      indent[`w:${key}Chars`] = effective.indentUnit === 'char' ? Math.round(amount * 100) : 0;
    }
  }
  if (Object.keys(indent).length) xml += leaf('w:ind', indent);
  xml += bool('contextualSpacing', p.contextualSpacing) + bool('mirrorIndents', p.mirrorIndents);
  xml += val('jc', p.alignment) + val('textAlignment', p.textAlignment) + val('outlineLvl', p.outlineLevel);
  return wrap('pPr', xml);
}

function tableProperties(table: Table): string {
  const allBorders = Object.fromEntries(['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(key => [key, table.border]));
  return wrap('tblPr', val('tblStyleRowBandSize', table.rowBandSize) + val('tblStyleColBandSize', table.colBandSize) + val('jc', table.alignment)
    + leaf('w:tblCellSpacing', { 'w:w': cm(table.cellSpacing), 'w:type': 'dxa' })
    + borders(allBorders, 'tblBorders') + shade(table.shading)
    + wrap('tblCellMar', (['top', 'left', 'bottom', 'right'] as const).map(key => leaf(`w:${key}`, { 'w:w': cm(table.cellMargins?.[key]??table.cellMargin), 'w:type': 'dxa' })).join('')))
    + wrap('tcPr', shade(table.shading) + val('vAlign', table.verticalAlign));
}

function numPr(numId: number, level?: number): string {
  return wrap('numPr', val('ilvl', level) + val('numId', numId));
}
function styleMetadata(style: Style, companion = false): string {
  return (style.autoUpdate && !companion ? '<w:autoRedefine/>' : '')
    + (style.hidden && !style.unhideWhenUsed ? '<w:hidden/>' : '')
    + val('uiPriority', style.priority)
    + (style.hidden && style.unhideWhenUsed ? '<w:semiHidden/>' : '')
    + (style.unhideWhenUsed ? '<w:unhideWhenUsed/>' : '')
    + (style.quickFormat && !companion ? '<w:qFormat/>' : '');
}

function sampleTableStyleId(project: Project): string {
  const ids = new Set([...project.styles.flatMap(s => [s.id, s.id + 'Char']), ...project.lists.map(l => l.id)]);
  let id = 'StudioTableSample'; while (ids.has(id)) id += '_'; return id;
}
function stylesPart(project: Project, sample = false): string {
  let xml = wrap('docDefaults', wrap('rPrDefault', runProperties({ ...baseRun, shading: undefined }, baseRun, false, true)) + wrap('pPrDefault', paragraphProperties({ ...baseParagraph, shading: undefined })));
  if (!project.styles.some(s=>s.id==='Normal')) xml += '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:semiHidden/></w:style>';
  if (sample) xml += `<w:style w:type="paragraph" w:customStyle="1" w:styleId="${sampleTableStyleId(project)}"><w:name w:val="表格示例正文"/><w:semiHidden/></w:style>`;
  for (const style of project.styles) {
    const base = project.styles.find(s => s.id === style.basedOn);
    const inherited = base ? resolveStyle(project, base) : { run: baseRun, paragraph: baseParagraph };
    const resolved = resolveStyle(project, style);
    // 未绑定的子样式必须显式取消编号，否则会继承基准标题的 numPr。
    let numbering = paragraphStyle(style) ? numPr(0) : '';
    if (paragraphStyle(style)) project.lists.forEach((list, index) => {
      const level = list.levels.findIndex(l => l.linkedStyle === style.id);
      if (level >= 0) numbering = numPr(index + 1, level);
    });
    let body = val('name', style.name) + (style.aliases ? val('aliases', style.aliases) : '') + val('basedOn', style.basedOn);
    if (paragraphStyle(style)) body += val('next', style.next);
    if (style.type === 'linked') body += val('link', `${style.id}Char`);
    body += styleMetadata(style);
    if (style.type !== 'character') body += paragraphProperties(style.paragraph, inherited.paragraph, numbering);
    // MS-OI29500 17.7.6(b)：Word 表格样式采用绝对值，段落/字符才反转。
    body += runProperties(style.run, inherited.run, style.type !== 'table');
    if (style.type === 'table' && style.table) {
      body += tableProperties(style.table);
      for (const name of regionNames) {
        const region = style.table.regions[name];
        if (!region) continue;
        const cell = borders(region.borders, 'tcBorders') + shade(region.shading) + val('vAlign', region.verticalAlign);
        body += `<w:tblStylePr w:type="${name}">${paragraphProperties(region.paragraph, resolved.paragraph)}${runProperties(region.run, resolved.run)}${wrap('tcPr', cell)}</w:tblStylePr>`;
      }
    }
    xml += `<w:style${attrs({ 'w:type': style.type === 'linked' ? 'paragraph' : style.type, 'w:customStyle': (style.id === 'Normal'||style.id==='TableNormal'&&style.type==='table') ? 0 : 1, 'w:default': (style.id === 'Normal'||style.id==='TableNormal'&&style.type==='table') ? 1 : undefined, 'w:styleId': style.id })}>${body}</w:style>`;
    if (style.type === 'linked') {
      const linkedBase = base?.type === 'linked' ? `${base.id}Char` : undefined;
      // 字符样式不能 basedOn 段落样式，非链接父样式的字体在字符副本中展开。
      const run = linkedBase ? style.run : resolved.run;
      xml += `<w:style w:type="character" w:customStyle="1" w:styleId="${escape(style.id)}Char">${val('name', `${style.name}（字符）`)}${val('basedOn', linkedBase)}${val('link', style.id)}${styleMetadata(style, true)}${runProperties(run, linkedBase ? inherited.run : baseRun, true)}</w:style>`;
    }
  }
  project.lists.forEach((list, index) => {
    // ilvl 只表示命名样式的应用层级，不保证所有 Word 版本画廊的缩略图选层。
    xml += `<w:style w:type="numbering" w:customStyle="1" w:styleId="${escape(list.id)}">${val('name', list.name)}${val('uiPriority', 40)}<w:qFormat/>${wrap('pPr', numPr(index + 1, list.galleryLevel ?? 0))}</w:style>`;
  });
  return `${XML}<w:styles ${NS}>${xml}</w:styles>`;
}

function stableHex(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}
function levelProperties(level: Level, index: number, pictureId?: number): string {
  // 默认“上一层及更高层重启”用省略表达；Word 不接受显式 lvlRestart=8。
  const restart = index > 0 && level.restart === index ? undefined : level.restart;
  let body = val('start', level.start) + val('numFmt', level.picture ? 'bullet' : level.format) + val('lvlRestart', restart)
    + val('pStyle', level.linkedStyle) + bool('isLgl', level.legal) + val('suff', level.follow)
    + val('lvlText', level.picture ? '•' : level.format === 'none' ? '' : level.text) + val('lvlPicBulletId', pictureId) + val('lvlJc', level.alignment);
  const indent = { 'w:left': cm(level.indent), [level.hanging < 0 ? 'w:firstLine' : 'w:hanging']: cm(Math.abs(level.hanging)) };
  body += wrap('pPr', (level.follow === 'tab' ? wrap('tabs', leaf('w:tab', { 'w:val': 'num', 'w:pos': cm(level.tabPosition) })) : '') + leaf('w:ind', indent));
  body += runProperties(level.run);
  return `<w:lvl w:ilvl="${index}">${body}</w:lvl>`;
}

interface Picture { id: number; path: string; data: Uint8Array; level: Level }
function collectPictures(project: Project): Picture[] {
  const pictures: Picture[] = [];
  project.lists.forEach(list => list.levels.forEach(level => {
    if (!level.picture) return;
    const [, type, encoded] = /^data:image\/(png|jpeg);base64,(.+)$/.exec(level.picture.data)!;
    const decoded = atob(encoded);
    pictures.push({ id: pictures.length + 1, path: `media/bullet${pictures.length + 1}.${type === 'jpeg' ? 'jpg' : 'png'}`, data: Uint8Array.from(decoded, c => c.charCodeAt(0)), level });
  }));
  return pictures;
}
function numberingPart(project: Project, pictures: Picture[]): string {
  let xml = pictures.map(picture => {
    const p = picture.level.picture!;
    return `<w:numPicBullet w:numPicBulletId="${picture.id}"><w:pict><v:shape id="_x0000_i${1024 + picture.id}" type="#_x0000_t75" style="width:${p.width}pt;height:${p.height}pt" o:bullet="t"><v:imagedata r:id="rIdBullet${picture.id}" o:title=""/></v:shape></w:pict></w:numPicBullet>`;
  }).join('');
  // 图片采用 Word 的传统图片项目符号容器，尺寸单位为磅。
  if (pictures.length) xml = xml.replace('<w:pict>', '<w:pict><v:shapetype id="_x0000_t75" coordsize="21600,21600" o:spt="75" o:preferrelative="t" path="m@4@5l@4@11@9@11@9@5xe" filled="f" stroked="f"><v:stroke joinstyle="miter"/><v:formulas><v:f eqn="if lineDrawn pixelLineWidth 0"/><v:f eqn="sum @0 1 0"/><v:f eqn="sum 0 0 @1"/><v:f eqn="prod @2 1 2"/><v:f eqn="prod @3 21600 pixelWidth"/><v:f eqn="prod @3 21600 pixelHeight"/><v:f eqn="sum @0 0 1"/><v:f eqn="prod @6 1 2"/><v:f eqn="prod @7 21600 pixelWidth"/><v:f eqn="sum @8 21600 0"/><v:f eqn="prod @7 21600 pixelHeight"/><v:f eqn="sum @10 21600 0"/></v:formulas><v:path o:extrusionok="f" gradientshapeok="t" o:connecttype="rect"/><o:lock v:ext="edit" aspectratio="t"/></v:shapetype>');
  project.lists.forEach((list, index) => {
    xml += `<w:abstractNum w:abstractNumId="${index}">${val('nsid', stableHex(list.id))}${val('multiLevelType', list.levels.length===1?'singleLevel':'multilevel')}${val('tmpl', stableHex(`template:${list.id}`))}${val('name', list.listNumName || list.name)}${val('styleLink', list.id)}${list.levels.map((level, i) => levelProperties(level, i, pictures.find(p => p.level === level)?.id)).join('')}</w:abstractNum>`;
  });
  project.lists.forEach((_, index) => { xml += `<w:num w:numId="${index + 1}">${val('abstractNumId', index)}</w:num>`; });
  return `${XML}<w:numbering ${NS} xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">${xml}</w:numbering>`;
}

function textRun(text: string, styleId?: string): string {
  return `<w:r>${styleId ? wrap('rPr', val('rStyle', styleId)) : ''}<w:t xml:space="preserve">${escape(text)}</w:t></w:r>`;
}
function sampleBody(project: Project): string {
  let body = `<w:p>${textRun(`${project.name} · 样式验收样例`)}</w:p>`;
  for (const style of project.styles) {
    if (paragraphStyle(style)) body += `<w:p>${paragraphProperties({}, baseParagraph, '', style.id)}${textRun(`${style.name} — 中文样式预览，The quick brown fox 0123456789。`)}</w:p>`;
    if (style.type === 'character' || style.type === 'linked') body += `<w:p>${textRun(`${style.name}：`)}${textRun('字符样式示例 AaBb 123 中文', style.type === 'linked' ? `${style.id}Char` : style.id)}</w:p>`;
    if (style.type === 'table') {
      const rows = Array.from({ length: 5 }, (_, row) => `<w:tr>${Array.from({ length: 3 }, (_, col) => `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="${sampleTableStyleId(project)}"/></w:pPr>${textRun(row === 0 ? `${style.name} · 栏 ${col + 1}` : `第 ${row} 行 · 第 ${col + 1} 列`)}</w:p></w:tc>`).join('')}</w:tr>`).join('');
      body += `<w:tbl><w:tblPr>${val('tblStyle', style.id)}<w:tblW w:w="0" w:type="auto"/><w:tblLook w:val="01E0" w:firstRow="1" w:lastRow="1" w:firstColumn="1" w:lastColumn="1" w:noHBand="0" w:noVBand="0"/></w:tblPr><w:tblGrid><w:gridCol w:w="2400"/><w:gridCol w:w="2400"/><w:gridCol w:w="2400"/></w:tblGrid>${rows}</w:tbl><w:p/>`;
    }
  }
  project.lists.forEach((list, index) => {
    body += `<w:p>${textRun(`多级列表：${list.name}`)}</w:p>`;
    // 先走完整九级，再回到上级；验收文档中的编号始终由 Word 动态计算。
    (list.levels.length===1?[0,0,0]:[...list.levels.map((_, i) => i), 0, 1, 2, 1]).forEach(level => {
      body += `<w:p>${paragraphProperties({}, baseParagraph, numPr(index + 1, level), list.levels[level].linkedStyle)}${textRun(`第 ${level + 1} 级列表内容`)}</w:p>`;
    });
  });
  return body;
}
function documentPart(project: Project, sample: boolean): string {
  const sizes = { A4: [11906, 16838], A5: [8391, 11906], Letter: [12240, 15840] };
  const dimensions = [...sizes[project.page.size]];
  if (project.page.orientation === 'landscape') dimensions.reverse();
  const page = project.page;
  const section = `<w:sectPr>${leaf('w:pgSz', { 'w:w': dimensions[0], 'w:h': dimensions[1], 'w:orient': page.orientation })}${leaf('w:pgMar', { 'w:top': cm(page.top), 'w:right': cm(page.right), 'w:bottom': cm(page.bottom), 'w:left': cm(page.left), 'w:header': cm(page.header??1.27), 'w:footer': cm(page.footer??1.27), 'w:gutter': cm(page.gutter) })}<w:cols w:space="720"/><w:docGrid w:type="lines" w:linePitch="312"/></w:sectPr>`;
  return `${XML}<w:document ${NS}><w:body>${sample ? sampleBody(project) : '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr></w:p>'}${section}</w:body></w:document>`;
}
const relationships = (entries: { id: string; type: string; target: string }[]) => `${XML}<Relationships xmlns="${PKG}">${entries.map(entry => leaf('Relationship', { Id: entry.id, Type: entry.type, Target: entry.target })).join('')}</Relationships>`;

/** 产生独立 OOXML parts，既供 ZIP 打包，也供结构验收和自家配置往返。 */
export function buildParts(input: Project, options: ExportOptions = {}): Record<string, string | Uint8Array> {
  const project = validateProject(input);
  const pictures = collectPictures(project);
  const parts: Record<string, string | Uint8Array> = {};
  const mainType = options.format === 'dotx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';
  const overrides: Record<string, string> = { '/word/document.xml': mainType, '/word/styles.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml', '/word/numbering.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml', '/word/settings.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml', '/docProps/core.xml': 'application/vnd.openxmlformats-package.core-properties+xml', '/docProps/app.xml': 'application/vnd.openxmlformats-officedocument.extended-properties+xml' };
  parts['[Content_Types].xml'] = `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${[['rels', 'application/vnd.openxmlformats-package.relationships+xml'], ['xml', 'application/xml'], ['json', 'application/json'], ['png', 'image/png'], ['jpg', 'image/jpeg']].map(([Extension, ContentType]) => leaf('Default', { Extension, ContentType })).join('')}${Object.entries(overrides).map(([PartName, ContentType]) => leaf('Override', { PartName, ContentType })).join('')}</Types>`;
  parts['_rels/.rels'] = relationships([{ id: 'rIdDocument', type: `${R}/officeDocument`, target: 'word/document.xml' }, { id: 'rIdCore', type: 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', target: 'docProps/core.xml' }, { id: 'rIdApp', type: `${R}/extended-properties`, target: 'docProps/app.xml' }]);
  parts['word/_rels/document.xml.rels'] = relationships([{ id: 'rIdStyles', type: `${R}/styles`, target: 'styles.xml' }, { id: 'rIdNumbering', type: `${R}/numbering`, target: 'numbering.xml' }, { id: 'rIdSettings', type: `${R}/settings`, target: 'settings.xml' }, { id: 'rIdStudio', type: 'https://style-studio.local/relationships/project', target: 'style-studio.json' }]);
  parts['word/styles.xml'] = stylesPart(project, options.sample ?? false);
  parts['word/numbering.xml'] = numberingPart(project, pictures);
  parts['word/document.xml'] = documentPart(project, options.sample ?? false);
  parts['word/settings.xml'] = `${XML}<w:settings ${NS}><w:zoom w:percent="100"/>${val('defaultTabStop', cm(project.page.defaultTab))}<w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
  parts['word/style-studio.json'] = JSON.stringify(project);
  parts['docProps/core.xml'] = `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escape(project.name)}</dc:title><dc:creator>Word 样式工作室</dc:creator><dc:description>包含自定义样式与动态多级列表的${options.sample ? '验收样例' : '空白文档'}</dc:description></cp:coreProperties>`;
  parts['docProps/app.xml'] = `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Word 样式工作室</Application></Properties>`;
  if (pictures.length) {
    parts['word/_rels/numbering.xml.rels'] = relationships(pictures.map(p => ({ id: `rIdBullet${p.id}`, type: `${R}/image`, target: p.path })));
    pictures.forEach(p => { parts[`word/${p.path}`] = p.data; });
  }
  return parts;
}

export function exportDocument(project: Project, options: ExportOptions = {}): Uint8Array {
  const parts = buildParts(project, options);
  return zipSync(Object.fromEntries(Object.entries(parts).map(([name, content]) => [name, typeof content === 'string' ? strToU8(content) : content])), { level: 6 });
}
