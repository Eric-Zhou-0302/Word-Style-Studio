import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,createBlankProject,resolveStyle,validateProject} from '../src/model';
import {buildParts,exportDocument} from '../src/export';
import {importWord} from '../src/import';
import {levelLabel,simulateList} from '../src/numbering';

const names=['报告标题','报告副标题','落款','目录标题','目录一级','目录二级','目录三级','一级标题','二级标题','三级标题','四级标题','五级标题','六级标题','报告正文','报告正文无缩进','正文编号一级','正文编号二级','正文项目符号','表题','图题','独立图表段','资料来源','脚注','表格表头','表格表体居中','表格表体左对齐','表格表体右对齐','表格表尾','标准表格'];
test('blank project contains only an independent Normal and exports no report or list definitions',()=>{
 const p=validateProject(createBlankProject());assert.equal(p.name,'未命名方案');
 assert.deepEqual(p.styles.map(s=>s.id),['Normal']);assert.deepEqual(p.lists,[]);
 assert.equal(p.styles[0].basedOn,undefined);assert.equal(p.styles[0].next,'Normal');
 assert.equal(p.page.top,2.54);assert.equal(p.page.header,1.27);
 const resolved=resolveStyle(p,p.styles[0]);assert.equal(resolved.run.font,'宋体');assert.equal(resolved.run.size,12);assert.equal(resolved.paragraph.line,1.5);
 const parts=buildParts(p);assert.doesNotMatch(String(parts['word/document.xml']),/<w:t[ >]/);
 assert.doesNotMatch(String(parts['word/styles.xml']),/Heading1|StandardTable|TableNormal/);
 assert.doesNotMatch(String(parts['word/numbering.xml']),/<w:abstractNum[ >]|<w:num[ >]/);
 p.styles[0].run.size=30;assert.deepEqual(createBlankProject().styles[0].run,{});
});
test('report preset matches all 29 named styles, font substitutions, sizes and paragraph rules',()=>{
 const p=validateProject(createProject());assert.equal(p.styles.length,29);assert.ok(p.styles.every(s=>s.id!=='Normal'&&!s.basedOn));
 assert.deepEqual(p.styles.map(s=>s.name),names);
 const sizes=[26,16,16,18,16,15,14,16,15,14,14,14,14,14,14,14,14,14,10.5,10.5,10.5,10.5,10.5,12,12,12,12,12];
 const bold=new Set([0,2,3,4,5,6,7,8,9,18,19,23,27]);
 const center=new Set([0,1,3,18,19,20,23,24,27]);
 const left=new Set([4,5,6,7,8,9,10,11,12,21,22,25]);
 p.styles.slice(0,-1).forEach((s,i)=>{
  assert.equal(s.type,'paragraph');const r=resolveStyle(p,s);
  assert.equal(r.run.size,sizes[i],s.name);assert.equal(r.run.font,i===0?'宋体':[4,7].includes(i)?'黑体':'楷体',s.name);
  assert.equal(r.run.latinFont,'Times New Roman');assert.equal(s.run.latinFont,undefined);
  assert.equal(r.run.bold,bold.has(i),s.name);assert.equal(r.run.color,i===21?'#595959':'#000000');
  assert.equal(r.paragraph.alignment,center.has(i)?'center':[2,26].includes(i)?'right':left.has(i)?'left':'both');
  assert.equal(r.paragraph.line,i<2?1.5:i===2?1.15:1);
  assert.equal(r.paragraph.before,i===7?12:i===8?8:[9,18,19].includes(i)?5:0);
  assert.equal(r.paragraph.after,i===7?12:i===8?8:[9,18,19,21].includes(i)?5:0);
  assert.equal(r.paragraph.keepLines,true);assert.equal(s.quickFormat,true);
 });
 const body=resolveStyle(p,p.styles.find(s=>s.id==='ReportBody')!);
 assert.equal(body.paragraph.firstLine,2);assert.equal(body.paragraph.indentUnit,'char');
 for(let i=1;i<=6;i++){const s=p.styles.find(s=>s.id==='Heading'+i)!;assert.equal(s.next,'ReportBody');assert.equal(s.paragraph.outlineLevel,i-1);assert.equal(s.paragraph.keepNext,true);}
 assert.equal(p.styles.find(s=>s.id==='StandardTable')?.basedOn,undefined);
 assert.deepEqual(p.styles.find(s=>s.id==='StandardTable')?.run,{});
 assert.deepEqual(p.styles.find(s=>s.id==='StandardTable')?.table?.regions,{});
 assert.equal(p.styles.filter(s=>s.quickFormat).length,29);
});
test('preset lists use distinct heading/body bindings and exact marker positions',()=>{
 const p=createProject();assert.equal(p.lists.length,3);
 const [h,n,b]=p.lists;
 assert.deepEqual(h.levels.slice(0,6).map((_,i)=>levelLabel(h,i)),['一、','（一）','1.','（1）','A.','a.']);
 assert.deepEqual(h.levels.slice(0,6).map(l=>l.follow),['nothing','nothing','tab','nothing','nothing','nothing']);
 assert.deepEqual(h.levels.slice(0,6).map(l=>Number((l.indent-l.hanging).toFixed(2))),[0,0,.99,.99,.99,.99]);
 assert.deepEqual(n.levels.slice(0,2).map(l=>l.indent),[1.73,2.47]);
 assert.deepEqual(simulateList(n,[0,1,1,0,1]).map(v=>v.label),['1、','（1）','（2）','2、','（1）']);
 assert.equal(levelLabel(b,0),'•');assert.equal(b.levels[0].follow,'tab');
});
test('report native XML has exact page distances, four table margins and clean style inheritance',()=>{
 const p=createProject();const parts=buildParts(p);const doc=String(parts['word/document.xml']);const styles=String(parts['word/styles.xml']);
 assert.match(doc,/w:top="1559"/);assert.match(doc,/w:bottom="1559"/);assert.match(doc,/w:left="1417"/);assert.match(doc,/w:right="1417"/);
 assert.match(doc,/w:header="850"/);assert.match(doc,/w:footer="850"/);assert.doesNotMatch(doc,/<w:t[ >]/);
 assert.match(styles,/w:ascii="Times New Roman"/);assert.doesNotMatch(styles,/GB2312|方正/);
 const table=styles.match(/<w:style[^>]+w:styleId="StandardTable">([\s\S]*?)<\/w:style>/)![1];
 assert.doesNotMatch(table,/<w:basedOn/);
 assert.match(table,/<w:top w:w="79"/);assert.match(table,/<w:bottom w:w="79"/);
 assert.match(table,/<w:left w:w="102"/);assert.match(table,/<w:right w:w="102"/);
 assert.match(table,/<w:vAlign w:val="center"/);assert.doesNotMatch(table,/<w:rPr>/);
 assert.doesNotMatch(styles,/TableNormal|Normal Table/);
 assert.match(styles,/w:firstLineChars="200"/);
 assert.doesNotMatch(String(parts['word/numbering.xml']),/w:lvlRestart w:val="8"/);
 const restored=importWord(exportDocument(p)).project;assert.deepEqual(restored,JSON.parse(JSON.stringify(p)));
});

test('report preset keeps Normal internal to export and retains 29 independent styles on round trip',async()=>{
 const p=createProject();
 const parts=buildParts(p,{sample:true});
 const xml=String(parts['word/styles.xml']);
 assert.match(xml,/<w:style w:type="paragraph" w:default="1" w:styleId="Normal">/);
 assert.doesNotMatch(xml,/<w:basedOn w:val="Normal"/);
 const result=await importWord(exportDocument(p,{sample:true}));
 assert.deepEqual(result.project.styles,JSON.parse(JSON.stringify(p.styles)));
});
