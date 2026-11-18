import {createLegacyProject as createProject} from './legacy-fixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';
import { buildParts, exportDocument } from '../src/export';
import { createBlankProject, createList, createStyle, removeStyle, tableDefault } from '../src/model';
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

test('deleting Normal still exports blank DOCX and DOTX and round-trips the remaining custom style', async () => {
  const {importWord}=await import('../src/import');
  for(const format of ['docx','dotx'] as const){
    for(const keepList of [false,true]){
      const input=createBlankProject();
      input.styles.push({...createStyle('paragraph','自定义正文','Normal'),id:'CustomBody'});
      input.lists=keepList?[createList('保留的列表')]:[];
      if(keepList)input.lists[0].levels[0].linkedStyle='CustomBody';
      const project=removeStyle(input,'Normal');
      assert.deepEqual(project.styles.map(style=>style.id),['CustomBody']);
      const before=structuredClone(project);
      const bytes=exportDocument(project,{format});
      const files=unzipSync(bytes);
      const document=strFromU8(files['word/document.xml']);
      const styles=strFromU8(files['word/styles.xml']);
      assert.match(styles,/<w:style w:type="paragraph" w:default="1" w:styleId="Normal">/);
      assert.match(styleXml(styles,'Normal'),/<w:semiHidden\/>/);
      assert.doesNotMatch(styleXml(styles,'Normal'),/<w:(qFormat|numPr)\b/);
      assert.match(styleXml(styles,'CustomBody'),/<w:next w:val="CustomBody"\/>/);
      assert.doesNotMatch(styleXml(styles,'CustomBody'),/<w:basedOn w:val="Normal"/);
      assert.match(document,/<w:body><w:p><w:pPr><w:pStyle w:val="Normal"\/><\/w:pPr><\/w:p><w:sectPr>/);
      assert.equal((document.match(/<w:p>/g)??[]).length,1);
      assert.doesNotMatch(document,/<w:(t|numPr)\b/);
      assert.match(strFromU8(files['[Content_Types].xml']),format==='dotx'?/wordprocessingml.template.main\+xml/:/wordprocessingml.document.main\+xml/);
      assert.deepEqual(JSON.parse(strFromU8(files['word/style-studio.json'])),JSON.parse(JSON.stringify(project)));
      assert.deepEqual(importWord(bytes).project,JSON.parse(JSON.stringify(project)));
      assert.deepEqual(project,before);
    }
  }
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

test('paragraph and character chains preserve explicit on, off and inherited font switches', () => {
  for (const type of ['paragraph', 'character', 'linked'] as const) {
    const project = createBlankProject();
    const base = createStyle(type, '基准');
    base.run = { bold: true, italic: true, caps: true };
    const inherit = createStyle(type, '继承', base.id);
    const off = createStyle(type, '关闭', base.id);
    off.run = { bold: false, italic: false, caps: false };
    const on = createStyle(type, '明确开启', base.id);
    on.run = { ...base.run };
    project.styles.push(base, inherit, off, on);
    const styles = xml(buildParts(project), 'word/styles.xml');
    for (const suffix of type === 'linked' ? ['', 'Char'] : ['']) {
      assert.doesNotMatch(styleXml(styles, inherit.id + suffix), /<w:(b|i|caps)\b/);
      for (const tag of ['b', 'i', 'caps']) {
        assert.ok(styleXml(styles, on.id + suffix).includes(`<w:${tag}/>`));
        assert.ok(styleXml(styles, off.id + suffix).includes(`<w:${tag} w:val="0"/>`));
      }
    }
  }
});

test('quick styles preserve both initial visibility and hidden-until-used intent', () => {
  const project = createProject();
  const visible = project.styles[1]; visible.unhideWhenUsed = true; visible.hidden = false; visible.priority = 7;
  const hidden = project.styles[2]; hidden.unhideWhenUsed = true; hidden.hidden = true;
  const permanent = project.styles[3]; permanent.unhideWhenUsed = false; permanent.hidden = true;
  const styles = xml(buildParts(project), 'word/styles.xml');
  assert.match(styleXml(styles, visible.id), /<w:uiPriority w:val="7"\/>/);
  assert.match(styleXml(styles, visible.id), /<w:qFormat\/>/);
  assert.doesNotMatch(styleXml(styles, visible.id), /<w:hidden\b|<w:semiHidden\/>/);
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
  const style = createStyle('paragraph', '格式验收');
  project.styles.push(style);
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
  project.styles[0].paragraph = { firstLine: 1, indentUnit: 'cm' };
  const styles = styleXml(xml(buildParts(project), 'word/styles.xml'), 'Normal');
  assert.match(styles, /w:firstLine="567"/);
  assert.doesNotMatch(styles, /w:hanging(?:Chars)?="/);
  assert.doesNotMatch(styles, /w:firstLineChars="/);
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
  for (const name of ['\u0001', '\uFFFE', '\uFFFF', '\uD800', '\uDC00']) {
    assert.throws(() => exportDocument({ ...createProject(), name }), /无效字符/);
  }
  assert.match(xml(buildParts({ ...createProject(), name: '论文 📚' }), 'docProps/core.xml'), /论文 📚/);
});

test('unlisted paragraph styles inherit character indentation through basedOn', () => {
  const project = createProject();
  const abstract = createStyle('paragraph', '中文摘要内容');
  abstract.paragraph = { alignment: 'left', indentUnit: 'char', firstLine: 2 };
  const keywords = createStyle('paragraph', '中文关键词', abstract.id);
  keywords.run = { bold: true };
  const child = createStyle('linked', '下一级', keywords.id);
  project.styles.push(child, keywords, abstract);

  const styles = xml(buildParts(project), 'word/styles.xml');
  const parentXml = styleXml(styles, abstract.id);
  assert.match(parentXml, /w:firstLineChars="200"/);
  assert.doesNotMatch(parentXml, /<w:numPr>/);
  for (const style of [keywords, child]) {
    const content = styleXml(styles, style.id);
    assert.ok(content.includes(`<w:basedOn w:val="${style.basedOn}"/>`));
    assert.doesNotMatch(content, /<w:(numPr|ind)\b/);
  }
  assert.match(styleXml(styles, keywords.id), /<w:b\/>/);
});

test('cancelling a numbered base preserves paragraph indents and stops at the first unlisted child', () => {
  for (const unit of ['char', 'cm'] as const) {
    const project = createProject();
    const heading = project.styles.find(s => s.id === 'Heading1')!;
    heading.paragraph = { indentUnit: unit, left: 1, right: 1, firstLine: -2 };
    const child = createStyle('paragraph', '无编号标题', heading.id);
    const grandchild = createStyle('paragraph', '无编号正文', child.id);
    grandchild.paragraph = { left: 0 };
    project.styles.push(grandchild, child);

    const styles = xml(buildParts(project), 'word/styles.xml');
    const content = styleXml(styles, child.id);
    assert.match(content, /<w:numPr><w:numId w:val="0"\/><\/w:numPr>/);
    assert.match(content, unit === 'char' ? /w:leftChars="100"/ : /w:left="567"/);
    assert.match(content, unit === 'char' ? /w:hangingChars="200"/ : /w:hanging="1134"/);
    assert.doesNotMatch(content, /w:right(?:Chars)?=/);
    const descendant = styleXml(styles, grandchild.id);
    assert.doesNotMatch(descendant, /<w:numPr>|w:(hanging|firstLine)(?:Chars)?=/);
    assert.match(descendant, unit === 'char' ? /w:leftChars="0"/ : /w:left="0"/);
  }
});

test('table samples avoid Normal overrides and default shading does not obscure cells', () => {
  const p=createProject();const parts=buildParts(p,{sample:true});
  assert.match(String(parts['word/document.xml']),/<w:pStyle w:val="StudioTableSample"\/>/);
  const defaults=String(parts['word/styles.xml']).match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)?.[0]??'';
  assert.doesNotMatch(defaults,/<w:shd|<w:highlight/);
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

test('English sample exports localize generated text, companion names and metadata', () => {
  const project = createProject();
  project.name = 'English Report';
  project.styles.forEach((style, index) => { style.name = `Report Style ${index + 1}`; });
  project.lists[0].name = 'Report Numbering';
  project.lists.push(createList('Report Bullets', 'bullet'), createList('Report Numbers', 'numbered'));
  const before = JSON.stringify(project);
  const parts = buildParts(project, {sample: true, locale: 'en'});
  const document = xml(parts, 'word/document.xml');
  assert.doesNotMatch(document, /[\u3400-\u9fff]/);
  assert.match(document, /English Report · Style Review Samples/);
  assert.match(document, /Character style sample AaBb 123/);
  assert.match(document, /Row 1 · Column 1/);
  assert.match(document, /Multilevel list: Report Numbering/);
  assert.match(document, /Bulleted list: Report Bullets/);
  assert.match(document, /Numbered list: Report Numbers/);
  assert.match(styleXml(xml(parts, 'word/styles.xml'), 'Heading1Char'), /Report Style 2 \(Character\)/);
  assert.match(styleXml(xml(parts, 'word/styles.xml'), 'StudioTableSample'), /Table Sample Text/);
  assert.match(xml(parts, 'docProps/core.xml'), /Word Style Studio/);
  assert.doesNotMatch(xml(parts, 'docProps/core.xml') + xml(parts, 'docProps/app.xml'), /[\u3400-\u9fff]/);
  assert.equal(JSON.stringify(project), before);
  assert.deepEqual(JSON.parse(xml(parts, 'word/style-studio.json')), JSON.parse(before));
});

test('export language preserves user names, numbering and truly blank documents', () => {
  const project = createProject();
  project.name = '用户中文方案';
  project.styles[1].name = '用户中文标题';
  project.lists[0].name = '用户中文编号';
  project.lists[0].levels[0].format = 'chineseCounting';
  project.lists[0].levels[0].text = '第%1章';
  const zh = buildParts(project, {sample: true});
  const en = buildParts(project, {sample: true, locale: 'en'});
  assert.match(xml(en, 'word/styles.xml'), /w:name w:val="用户中文标题"/);
  assert.match(xml(en, 'word/styles.xml'), /w:name w:val="用户中文标题 \(Character\)"/);
  assert.match(xml(en, 'word/document.xml'), /用户中文方案 · Style Review Samples/);
  assert.match(xml(en, 'word/document.xml'), /Multilevel list: 用户中文编号/);
  assert.equal(xml(en, 'word/numbering.xml'), xml(zh, 'word/numbering.xml'));
  assert.equal(xml(en, 'word/style-studio.json'), xml(zh, 'word/style-studio.json'));
  assert.equal(xml(buildParts(project, {locale: 'en'}), 'word/document.xml'), xml(buildParts(project), 'word/document.xml'));
  assert.doesNotMatch(xml(buildParts(project, {locale: 'en'}), 'word/document.xml'), /<w:t\b/);
});

test('single-unit indents serialize one direction and preserve an explicit zero', () => {
  for (const unit of ['char','cm'] as const) for (const amount of [2,-2,0]) {
    const project = createBlankProject();
    project.styles[0].paragraph = { firstLine: amount, indentUnit: unit };
    const content = styleXml(xml(buildParts(project), 'word/styles.xml'), 'Normal');
    const attrs = Array.from(content.matchAll(/w:(firstLine|hanging)(Chars)?="([^"]*)"/g));
    assert.equal(attrs.length, 1);
    assert.equal(attrs[0][1], amount < 0 ? 'hanging' : 'firstLine');
    assert.equal(attrs[0][2] ?? '', unit === 'char' ? 'Chars' : '');
    assert.equal(Number(attrs[0][3]), unit === 'char' ? Math.abs(amount) * 100 : Math.round(Math.abs(amount) * 1440 / 2.54));
  }
});

test('unit changes preserve real ancestry and serialize the Word unit resets without creating style IDs', () => {
  const p = createBlankProject();
  const base = { ...createStyle('paragraph', 'Base'), id: 'Char' };
  base.paragraph = { indentUnit:'char', left:2, firstLine:2, spacingUnit:'line', before:1 };
  const child = { ...createStyle('paragraph', 'Child', base.id), id:'X' };
  child.paragraph = { indentUnit:'cm', firstLine:-0.5 };
  const grand = createStyle('paragraph', 'Grandchild', child.id);
  grand.paragraph = { spacingUnit:'pt', before:6 };
  const linked = { ...createStyle('linked', 'Linked'), id:'XExportBase' };
  p.styles.push(grand, child, base, linked);
  const original = JSON.stringify(p);
  const styles = xml(buildParts(p), 'word/styles.xml');
  const ids = [...styles.matchAll(/w:styleId="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, p.styles.length + 1);
  assert.equal(new Set(ids).size, ids.length);
  const childXml = styleXml(styles, child.id);
  assert.ok(childXml.includes(`<w:basedOn w:val="${base.id}"/>`));
  assert.match(childXml, /w:firstLineChars="0"/);
  assert.match(childXml, /w:hanging="283"/);
  assert.match(childXml, /w:leftChars="0"/);
  const grandXml = styleXml(styles, grand.id);
  assert.ok(grandXml.includes(`<w:basedOn w:val="${child.id}"/>`));
  assert.match(grandXml, /w:beforeLines="0"/);
  assert.match(grandXml, /w:before="120"/);
  assert.doesNotMatch(grandXml, /<w:ind/);
  assert.equal(JSON.stringify(p), original);
});

test('recommended styles keep configured priorities independently of sidebar order',()=>{
 const project=createProject();project.styles.reverse();project.styles.forEach(s=>s.priority=42);
 const before=JSON.stringify(project);
 for(const sample of [false,true]){
  const parts=buildParts(project,{sample});const styles=xml(parts,'word/styles.xml');const settings=xml(parts,'word/settings.xml');
  assert.match(settings,/<w:stylePaneSortMethod w:val="priority"\/>/);
  assert.match(settings,/w:visibleStyles="1"/);assert.match(settings,/w:latentStyles="0"/);
  assert.match(styles,/<w:latentStyles[^>]*w:defSemiHidden="1"[^>]*w:defUnhideWhenUsed="0"[^>]*w:defQFormat="0"/);
  project.styles.forEach(s=>assert.ok(styleXml(styles,s.id).includes(`<w:uiPriority w:val="${s.priority}"/>`)));
  for(const list of project.lists){const body=styleXml(styles,list.id);assert.doesNotMatch(body,/<w:hidden|<w:semiHidden\/>/);assert.match(body,/<w:qFormat\/>/);}
  for(const style of project.styles.filter(s=>s.type==='linked')){const body=styleXml(styles,style.id+'Char');assert.match(body,/<w:hidden\/>/);assert.doesNotMatch(body,/<w:qFormat|<w:unhideWhenUsed\/>/);}
 }
 assert.equal(JSON.stringify(project),before);
});

 test('list priorities follow sidebar grouping without changing numbering IDs',()=>{
  const p=createProject();
  const numbered=createList('Numbered','numbered'),bullet=createList('Bullet','bullet'),multi=createList('Multilevel');
  p.lists=[numbered,multi,bullet];
  const parts=buildParts(p);const styles=xml(parts,'word/styles.xml');
  for(const [i,list] of [multi,bullet,numbered].entries()){
   const content=styleXml(styles,list.id);
   assert.ok(content.includes(`<w:uiPriority w:val="${Math.max(...p.styles.map(style => style.priority)) + i + 1}"/>`));
   assert.ok(content.includes(`<w:numId w:val="${p.lists.indexOf(list)+1}"/>`));
   assert.match(content,/<w:qFormat\/>/);assert.doesNotMatch(content,/<w:hidden\/>|<w:semiHidden\/>/);
  }
 });

test('bound paragraphs take their position from the level and keep independent right indentation', () => {
  const project = createBlankProject();
  const base = project.styles[0];
  base.paragraph = { indentUnit: 'char', left: 3, firstLine: 2 };
  const bound = createStyle('paragraph', '关联段落', base.id);
  bound.paragraph = { left: 1, firstLine: 2, right: 0.75 };
  bound.run = { underline: 'double' };
  project.styles.push(bound);
  const list = createList('编号', 'numbered');
  Object.assign(list.levels[0], { linkedStyle: bound.id, indent: 1.5, hanging: 0.5, run: { underlineColor: '#00aa00' } });
  project.lists.push(list);

  const parts = buildParts(project);
  const paragraph = styleXml(xml(parts, 'word/styles.xml'), bound.id);
  assert.match(paragraph, /<w:ind w:rightChars="75"\/>/);
  assert.match(paragraph, /<w:numId w:val="1"\/>/);
  const level = xml(parts, 'word/numbering.xml');
  assert.ok(level.includes(`<w:pStyle w:val="${bound.id}"/>`));
  for (const property of ['leftChars="0"', 'firstLineChars="0"', 'left="850"', 'hanging="283"']) assert.ok(level.includes('w:' + property));
  assert.match(level, /<w:u w:val="double" w:color="00AA00"\/>/);
});

test('linked character companions inherit linked ancestors and only copy explicit paragraph settings', () => {
  const project = createBlankProject();
  const root = createStyle('linked', '链接基准');
  root.run = { italic: true };
  const parent = createStyle('paragraph', '中间段落', root.id);
  parent.run = { color: '#112233' };
  const child = createStyle('linked', '链接子级', parent.id);
  child.run = { bold: true };
  project.styles.push(root, parent, child);
  const styles = xml(buildParts(project), 'word/styles.xml');
  const first = styleXml(styles, root.id + 'Char');
  assert.match(first, /<w:i\/>/);
  assert.doesNotMatch(first, /<w:(rFonts|sz|color|b)\b/);
  const companion = styleXml(styles, child.id + 'Char');
  assert.ok(companion.includes(`<w:basedOn w:val="${root.id}Char"/>`));
  assert.match(companion, /<w:b\/>/);
  assert.match(companion, /<w:color w:val="112233"\/>/);
  assert.doesNotMatch(companion, /<w:(rFonts|sz|i)\b/);
});

test('conditional table formatting resolves the parent region and samples include both band groups', () => {
  const project = createBlankProject();
  const parent = createStyle('table', '父表');
  parent.table!.colBandSize = 2;
  parent.table!.regions = {
    firstRow: { run: { underline: 'double' }, paragraph: { indentUnit: 'char', firstLine: 1, spacingUnit: 'line', before: 1, lineRule: 'exact', line: 18 } },
    band2Vert: { run: {}, paragraph: {}, shading: '#aaccee' },
  };
  const child = createStyle('table', '子表', parent.id);
  child.table = { ...parent.table!, regions: { firstRow: { run: { underlineColor: '#00aa00' }, paragraph: { firstLine: 2, before: 2, line: 20 } } } };
  project.styles.push(parent, child);
  const parts = buildParts(project, { sample: true });
  const region = styleXml(xml(parts, 'word/styles.xml'), child.id).match(/<w:tblStylePr w:type="firstRow">([\s\S]*?)<\/w:tblStylePr>/)![1];
  for (const attr of ['w:firstLineChars="200"', 'w:beforeLines="200"', 'w:line="400"', 'w:lineRule="exact"', 'w:val="double" w:color="00AA00"']) assert.ok(region.includes(attr));
  const tables = [...xml(parts, 'word/document.xml').matchAll(/<w:tbl>([\s\S]*?)<\/w:tbl>/g)];
  assert.equal(tables.length, 2);
  for (const [, table] of tables) {
    assert.equal((table.match(/<w:gridCol\b/g) ?? []).length, 6);
    for (const [, row] of table.matchAll(/<w:tr>([\s\S]*?)<\/w:tr>/g)) assert.equal((row.match(/<w:tc>/g) ?? []).length, 6);
  }
});

test('Word visibility values and mirrored page settings follow the native schema', () => {
  const project = createProject();
  project.page.mirrorMargins = true;
  const parts = buildParts(project, { sample: true });
  const styles = xml(parts, 'word/styles.xml');
  assert.doesNotMatch(styles, /<w:(semiHidden|unhideWhenUsed) w:val="[01]"/);
  assert.match(styles, /<w:semiHidden w:val="off"\/>/);
  assert.match(xml(parts, 'word/settings.xml'), /<w:mirrorMargins\/>[\s\S]*<w:stylePaneFormatFilter[\s\S]*<w:defaultTabStop/);
});
