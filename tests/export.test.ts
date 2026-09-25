import {createLegacyProject as createProject} from './legacy-fixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';
import { buildParts, exportDocument } from '../src/export';
import { createList, createStyle, tableDefault } from '../src/model';
import type { Project } from '../src/model';

const xml = (parts: ReturnType<typeof buildParts>, name: string) => {
  assert.equal(typeof parts[name], 'string');
  return parts[name] as string;
};
const styleXml = (styles: string, id: string) => {
  const content = styles.match(new RegExp(`<w:style\\b[^>]*w:styleId="${id}"[^>]*>([\\s\\S]*?)</w:style>`));
  assert.ok(content, `Missing style ${id}`);
  return content[1];
};

test('blank DOCX preserves all unused styles and its JSON without body text', () => {
  const project = createProject();
  const bytes = exportDocument(project);
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  const files = unzipSync(bytes);
  assert.deepEqual(JSON.parse(strFromU8(files['word/style-studio.json'])), JSON.parse(JSON.stringify(project)));
  const document = strFromU8(files['word/document.xml']);
  assert.doesNotMatch(document, /<w:t[ >]/);
  assert.match(document, /<w:body><w:p><w:pPr><w:pStyle w:val="Normal"\/><\/w:pPr><\/w:p><w:sectPr>/);
  assert.equal((document.match(/<w:p>/g) ?? []).length, 1);
  for (const style of project.styles) assert.ok(strFromU8(files['word/styles.xml']).includes(`w:styleId="${style.id}"`));
  assert.match(strFromU8(files['word/_rels/document.xml.rels']), /Target="style-studio.json"/);
  assert.match(strFromU8(files['[Content_Types].xml']), /Extension="json" ContentType="application\/json"/);
});

test('DOTX main content type is a template rather than a renamed document', () => {
  const project = createProject();
  assert.match(xml(buildParts(project), '[Content_Types].xml'), /wordprocessingml.document.main\+xml/);
  assert.match(xml(buildParts(project, { format: 'dotx' }), '[Content_Types].xml'), /wordprocessingml.template.main\+xml/);
});

test('linked styles have reciprocal links and compatible character ancestry', () => {
  const project = createProject();
  project.styles[2].basedOn = 'Heading1';
  const styles = xml(buildParts(project), 'word/styles.xml');
  assert.match(styleXml(styles, 'Heading1'), /<w:link w:val="Heading1Char"\/>/);
  const char = styleXml(styles, 'Heading1Char');
  assert.match(char, /<w:link w:val="Heading1"\/>/);
  assert.doesNotMatch(char, /<w:basedOn w:val="Normal"/);
  assert.match(styleXml(styles, 'Heading2Char'), /<w:basedOn w:val="Heading1Char"\/>/);
});

test('style booleans encode effective overrides using Word toggle semantics', () => {
  const project = createProject();
  const parent = { ...createStyle('paragraph', '粗体基准', 'Normal'), id: 'ToggleBase', run: { bold: true, italic: true, caps: true } };
  const inherit = { ...createStyle('paragraph', '继承', parent.id), id: 'ToggleInherit', run: {} };
  const off = { ...createStyle('paragraph', '关闭', parent.id), id: 'ToggleOff', run: { bold: false, italic: false, caps: false } };
  const on = { ...createStyle('paragraph', '明确开启', parent.id), id: 'ToggleOn', run: { bold: true, italic: true, caps: true } };
  project.styles.push(parent, inherit, off, on);
  const styles = xml(buildParts(project), 'word/styles.xml');
  assert.doesNotMatch(styleXml(styles, inherit.id), /<w:(b|i|caps)\b/);
  for (const property of ['b', 'i', 'caps']) {
    assert.match(styleXml(styles, parent.id), new RegExp(`<w:${property} w:val="1"/>`));
    assert.match(styleXml(styles, off.id), new RegExp(`<w:${property} w:val="1"/>`));
    assert.match(styleXml(styles, on.id), new RegExp(`<w:${property} w:val="0"/>`));
  }
  // 真值模拟 Word 样式继承，不能只验证 XML 中存在一个 false。
  const effective = (id: string, property: string): boolean => {
    const content = styleXml(styles, id);
    const base = content.match(/<w:basedOn w:val="([^"]+)"/);
    const parentValue = base ? effective(base[1], property) : false;
    const own = content.match(new RegExp(`<w:${property} w:val="([01])"`));
    return own?.[1] === '1' ? !parentValue : parentValue;
  };
  assert.equal(effective(inherit.id, 'b'), true);
  assert.equal(effective(off.id, 'b'), false);
  assert.equal(effective(on.id, 'b'), true);
});

test('quick styles preserve both initial visibility and hidden-until-used intent', () => {
  const project = createProject();
  const visible = project.styles[1]; visible.unhideWhenUsed = true; visible.hidden = false; visible.priority = 7;
  const hidden = project.styles[2]; hidden.unhideWhenUsed = true; hidden.hidden = true;
  const permanent = project.styles[3]; permanent.unhideWhenUsed = false; permanent.hidden = true;
  const styles = xml(buildParts(project), 'word/styles.xml');
  assert.match(styleXml(styles, visible.id), /<w:uiPriority w:val="7"\/>/);
  assert.match(styleXml(styles, visible.id), /<w:qFormat\/>/);
  assert.doesNotMatch(styleXml(styles, visible.id), /<w:(semiHidden|hidden)\b/);
  assert.match(styleXml(styles, hidden.id), /<w:semiHidden\/><w:unhideWhenUsed\/>/);
  assert.match(styleXml(styles, permanent.id), /<w:hidden\/>/);
});

test('multiple nine-level lists retain independent dynamic definitions and reciprocal bindings', () => {
  const project = createProject();
  const second = createList('附录列表'); second.id = 'Appendices'; second.listNumName = 'AppendixNum'; second.galleryLevel = 2;
  second.levels[1].restart = 0;
  second.levels[2].restart = 1;
  second.levels[2].legal = true;
  project.lists.push(second);
  const parts = buildParts(project);
  const numbering = xml(parts, 'word/numbering.xml');
  assert.equal((numbering.match(/<w:abstractNum /g) ?? []).length, 2);
  assert.equal((numbering.match(/<w:lvl /g) ?? []).length, 18);
  assert.match(numbering, /<w:num w:numId="1"><w:abstractNumId w:val="0"\/><\/w:num>/);
  assert.match(numbering, /<w:num w:numId="2"><w:abstractNumId w:val="1"\/><\/w:num>/);
  assert.match(numbering, /<w:pStyle w:val="Heading1"\/>/);
  assert.match(numbering, /<w:styleLink w:val="Appendices"\/>/);
  assert.match(numbering, /<w:name w:val="AppendixNum"\/>/);
  assert.match(numbering, /<w:lvlText w:val="%1.%2.%3"\/>/);
  assert.match(numbering, /<w:lvlRestart w:val="0"\/>/);
  assert.match(numbering, /<w:lvlRestart w:val="1"\/>/);
  assert.doesNotMatch(numbering, /<w:lvlRestart w:val="8"/);
  assert.match(styleXml(xml(parts, 'word/styles.xml'), 'Heading1'), /<w:numPr><w:ilvl w:val="0"\/><w:numId w:val="1"\/><\/w:numPr>/);
  assert.match(styleXml(xml(parts, 'word/styles.xml'), 'Appendices'), /<w:ilvl w:val="2"\/><w:numId w:val="2"\/>/);
});

test('advanced font, paragraph, borders and table regions serialize as native properties', () => {
  const project = createProject();
  const style = project.styles[1];
  style.run = { font: '宋体 & "文字"', latinFont: 'Arial', size: 10.5, bold: false, italic: true, underline: 'double', underlineColor: '#ff0000', shading: '#eeeeee', ligatures: 'standardContextual', numForm: 'oldStyle', numSpacing: 'tabular', contextualAlternates: true, spacing: -0.5, position: 2, kerning: 12, scale: 90 };
  style.paragraph = { indentUnit: 'char', left: 2, firstLine: -2, before: 1.5, spacingUnit: 'line', lineRule: 'exact', line: 18, keepNext: false, tabs: [{ position: 2.54, alignment: 'decimal', leader: 'dot' }], borders: { bottom: { style: 'double', color: '#123456', width: 1.5, space: 6 } } };
  const table = project.styles.find(s => s.type === 'table')!;
  table.table = structuredClone(tableDefault);
  table.table.regions.seCell = { run: { bold: true }, paragraph: { alignment: 'right' }, verticalAlign: 'bottom', shading: '#ff0000', borders: { bottom: { style: 'single', color: '#000000', width: 1, space: 0 } } };
  const styles = xml(buildParts(project), 'word/styles.xml');
  const content = styleXml(styles, style.id);
  assert.match(content, /w:eastAsia="宋体 &amp; &quot;文字&quot;"/);
  assert.match(content, /<w14:ligatures w14:val="standardContextual"\/>/);
  assert.match(content, /<w14:cntxtAlts w14:val="1"\/>/);
  assert.match(content, /<w:sz w:val="21"\/>/);
  assert.match(content, /w:beforeLines="150"/);
  assert.match(content, /w:line="360" w:lineRule="exact"/);
  assert.match(content, /w:leftChars="200"/);
  assert.match(content, /w:hangingChars="200"/);
  assert.match(content, /<w:tab w:val="decimal" w:leader="dot" w:pos="1440"\/>/);
  assert.match(content, /<w:bottom w:val="double" w:sz="12" w:space="6" w:color="123456"\/>/);
  assert.match(styleXml(styles, table.id), /<w:tblStylePr w:type="seCell">[\s\S]*<w:tcBorders>[\s\S]*<w:vAlign w:val="bottom"\/>/);
});

test('first-line indentation does not also emit a hanging value that cancels it', () => {
  const project = createProject();
  project.styles[1].paragraph = { firstLine: 1, indentUnit: 'cm' };
  const styles = styleXml(xml(buildParts(project), 'word/styles.xml'), 'Heading1');
  assert.match(styles, /w:firstLine="567"/);
  assert.doesNotMatch(styles, /w:hanging="/);
});

test('table and conditional table booleans are absolute Word properties, not style toggles', () => {
  const project = createProject();
  const table = project.styles.find(s => s.type === 'table')!;
  table.run = { bold: true, italic: true };
  table.table!.regions.firstRow = { run: { bold: true, italic: false }, paragraph: {} };
  const child = { ...createStyle('table', '继承表格', table.id), id: 'ChildTable', run: { bold: false } };
  project.styles.push(child);
  const styles = xml(buildParts(project), 'word/styles.xml');
  const region = styleXml(styles, table.id).match(/<w:tblStylePr w:type="firstRow">([\s\S]*?)<\/w:tblStylePr>/)![1];
  assert.match(region, /<w:b w:val="1"\/>/);
  assert.match(region, /<w:i w:val="0"\/>/);
  assert.match(styleXml(styles, child.id), /<w:b w:val="0"\/>/);
});

test('picture bullets have package media, relationships and level picture references', () => {
  const project = createProject();
  project.lists[0].levels[0].picture = { data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1kAAAAASUVORK5CYII=', width: 12, height: 9 };
  const parts = buildParts(project);
  assert.ok(parts['word/media/bullet1.png'] instanceof Uint8Array);
  assert.match(xml(parts, 'word/numbering.xml'), /<w:numPicBullet w:numPicBulletId="1">/);
  assert.match(xml(parts, 'word/numbering.xml'), /<w:lvlPicBulletId w:val="1"\/>/);
  assert.match(xml(parts, 'word/numbering.xml'), /style="width:12pt;height:9pt"/);
  assert.match(xml(parts, 'word/_rels/numbering.xml.rels'), /Id="rIdBullet1"[^>]+Target="media\/bullet1.png"/);
});

test('sample content applies genuine styles and list references without baked-in numbers', () => {
  const project = createProject();
  const body = xml(buildParts(project, { sample: true }), 'word/document.xml');
  assert.match(body, /<w:pStyle w:val="Heading1"\/>/);
  assert.match(body, /<w:rStyle w:val="Heading1Char"\/>/);
  assert.match(body, /<w:numPr><w:ilvl w:val="8"\/><w:numId w:val="1"\/><\/w:numPr>/);
  assert.match(body, /<w:tblStyle w:val="/);
  assert.doesNotMatch(body, /<w:t[^>]*>1\.2\./);
});

test('export validates dangerous or inconsistent input before creating a package', () => {
  const project = createProject();
  project.styles[1].basedOn = project.styles[1].id;
  assert.throws(() => exportDocument(project), /循环/);
  assert.throws(() => buildParts({ ...createProject(), name: '\u0001' } as Project), /无效字符/);
});

test('unbound styles do not inherit numbering from a numbered base', () => {
  const p=createProject();const s=createStyle('paragraph','无编号标题','Heading1');p.styles.push(s);
  const styles=String(buildParts(p)['word/styles.xml']);
  assert.match(styleXml(styles,s.id),/<w:numId w:val="0"\/>/);
});

test('table samples avoid Normal overrides and default shading does not obscure cells', () => {
  const p=createProject();const parts=buildParts(p,{sample:true});
  assert.match(String(parts['word/document.xml']),/<w:pStyle w:val="StudioTableSample"\/>/);
  const defaults=String(parts['word/styles.xml']).match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)?.[0]??'';
  assert.doesNotMatch(defaults,/<w:shd/);
  assert.doesNotMatch(String(buildParts(p)['word/styles.xml']),/StudioTableSample/);
});

test('single-level bullet and numbered lists export native singleLevel definitions and valid samples', async () => {
 const p=createProject();p.lists=[createList('符号','bullet'),createList('编号','numbered')];
 p.styles.forEach(s=>{s.paragraph.outlineLevel=undefined;});
 p.lists[1].levels[0].start=12;
 const parts=buildParts(p,{sample:true});
 const numbering=xml(parts,'word/numbering.xml');
 assert.equal((numbering.match(/w:multiLevelType w:val="singleLevel"/g)||[]).length,2);
 assert.equal((numbering.match(/<w:lvl w:ilvl="0"/g)||[]).length,2);
 assert.doesNotMatch(numbering,/<w:lvl w:ilvl="[1-8]"/);
 assert.match(numbering,/<w:start w:val="12"/);
 assert.doesNotMatch(xml(parts,'word/document.xml'),/<w:ilvl w:val="[1-8]"/);
 const {importWord}=await import('../src/import');
 assert.deepEqual(importWord(await exportDocument(p)).project,JSON.parse(JSON.stringify(p)));
});
