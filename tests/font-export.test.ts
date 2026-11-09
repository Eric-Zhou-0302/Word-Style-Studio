import test from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';
import { buildParts, exportDocument } from '../src/export';
import { importWord } from '../src/import';
import { createBlankProject, createList, createStyle } from '../src/model';
import type { Run } from '../src/model';

const languages = ['zh-CN', 'zh-TW', 'ja-JP', 'en-US', 'en-GB'] as const;
const styleXml = (xml: string, id: string) => {
  const match = xml.match(new RegExp(`<w:style\\b[^>]*w:styleId="${id}"[^>]*>([\\s\\S]*?)</w:style>`));
  assert.ok(match, id);
  return match[1];
};

test('default proofing separates Western and East Asian text so Mac Word uses Western fonts', () => {
  const project = createBlankProject();
  for (const format of ['docx', 'dotx'] as const) for (const sample of [false, true]) {
    const files = unzipSync(exportDocument(project, {format, sample}));
    const styles = strFromU8(files['word/styles.xml']);
    const defaults = styles.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/)![0];
    assert.match(defaults, /<w:lang w:val="en-US" w:eastAsia="zh-CN"\/>/);
    assert.match(defaults, /w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体"/);
    assert.doesNotMatch(styles, /<w:lang[^>]*w:val="(?:zh-CN|zh-TW|ja-JP)"/);
    assert.doesNotMatch(styleXml(styles, 'Normal'), /<w:lang/);
    if (!sample) assert.doesNotMatch(strFromU8(files['word/document.xml']), /<w:t\b/);
    assert.deepEqual(importWord(exportDocument(project, {format, sample})).project, JSON.parse(JSON.stringify(project)));
  }
});

test('all explicit proofing languages preserve font slots across styles, table regions and numbering', () => {
  for (const language of languages) {
    const project = createBlankProject();
    const run: Run = {font:'楷体', latinFont:'Courier New', language};
    project.styles[0].run = {...run};
    for (const type of ['paragraph', 'character', 'linked', 'table'] as const) {
      const style = {...createStyle(type, type), id:type, run:{...run}};
      if (style.table) style.table.regions.firstRow = {run:{...run}, paragraph:{}};
      project.styles.push(style);
    }
    const list = createList('Font test', 'numbered');
    list.levels[0].run = {...run};
    project.lists.push(list);
    const parts = buildParts(project);
    const styles = String(parts['word/styles.xml']);
    const western = language.startsWith('en-');
    const expected = western ? `<w:lang w:val="${language}"/>` : `<w:lang w:val="en-US" w:eastAsia="${language}"/>`;
    const regions = styleXml(styles, 'table').match(/<w:tblStylePr\b[^>]*>([\s\S]*?)<\/w:tblStylePr>/)![1];
    for (const content of [
      ...['Normal', 'paragraph', 'character', 'linked', 'linkedChar', 'table'].map(id => styleXml(styles, id)),
      regions, String(parts['word/numbering.xml']),
    ]) {
      assert.ok(content.includes(expected), `${language}: ${content}`);
      assert.match(content, /w:ascii="Courier New" w:hAnsi="Courier New" w:eastAsia="楷体" w:cs="Courier New"/);
      assert.doesNotMatch(content, /<w:lang[^>]*w:val="(?:zh-CN|zh-TW|ja-JP)"/);
    }
    assert.deepEqual(importWord(exportDocument(project)).project, JSON.parse(JSON.stringify(project)));
  }
});

test('font overrides keep their language inheritance and do not bake fonts into sample text', () => {
  const project = createBlankProject();
  project.styles[0].run = {font:'宋体', latinFont:'Times New Roman', language:'en-GB'};
  const child = {...createStyle('paragraph', 'Child', 'Normal'), id:'Child', run:{latinFont:'Arial'}};
  project.styles.push(child);
  const list = createList('Inherited font', 'numbered');
  list.levels[0].linkedStyle = child.id;
  project.lists.push(list);
  const before = JSON.stringify(project);
  const parts = buildParts(project, {sample:true});
  const style = styleXml(String(parts['word/styles.xml']), child.id);
  assert.match(style, /w:ascii="Arial" w:hAnsi="Arial"/);
  assert.match(style, /<w:basedOn w:val="Normal"\/>/);
  assert.doesNotMatch(style, /<w:lang/);
  assert.doesNotMatch(String(parts['word/numbering.xml']), /<w:lang|<w:rFonts/);
  assert.doesNotMatch(String(parts['word/document.xml']), /<w:lang|<w:rFonts/);
  assert.equal(JSON.stringify(project), before);
});
