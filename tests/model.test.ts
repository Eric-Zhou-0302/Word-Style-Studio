import {createLegacyProject as createProject} from './legacy-fixture';
import assert from 'node:assert/strict';
import test from 'node:test';
import { bindStyle, borderDefault, canBaseOn, createList, createStyle, numberFormats, removeStyle, resolveStyle, validateProject } from '../src/model';
import type { Level, Project, Style, TabStop } from '../src/model';
import { formatNumber, levelLabel, simulateList } from '../src/numbering';

function addStyle(project: Project, id: string, basedOn = 'Normal', type: Style['type'] = 'paragraph') {
  const style = { ...createStyle(type,id,basedOn), id };
  project.styles.push(style);
  return style;
}
const tab = (position: number, alignment: TabStop['alignment'] = 'left', leader: TabStop['leader'] = 'none'): TabStop => ({position,alignment,leader});

test('default project is valid and resolving does not modify its source', () => {
  const project=createProject(), before=structuredClone(project);
  assert.doesNotThrow(()=>validateProject(project));
  const resolved=resolveStyle(project,project.styles[1]);
  assert.equal(resolved.run.font,'黑体');
  assert.equal(resolved.paragraph.widowControl,true);
  resolved.paragraph.borders.left={...borderDefault};
  resolved.run.color='#ffffff';
  assert.deepEqual(project,before);
  assert.deepEqual(resolveStyle(project,project.styles[0]).paragraph.borders,{});
});

test('style inheritance preserves explicit false and merges border sides', () => {
  const project=createProject();
  const parent=addStyle(project,'Parent');
  parent.run={bold:true,italic:true,color:'#123456'};
  parent.paragraph={keepNext:true,borders:{left:{...borderDefault,color:'#123456'},bottom:{...borderDefault}}};
  const child=addStyle(project,'Child','Parent');
  child.run={bold:false,italic:undefined};
  child.paragraph={keepNext:false,borders:{bottom:{...borderDefault,style:'none'}}};
  const resolved=resolveStyle(project,child);
  assert.equal(resolved.run.bold,false);
  assert.equal(resolved.run.italic,true);
  assert.equal(resolved.run.color,'#123456');
  assert.equal(resolved.paragraph.keepNext,false);
  assert.equal(resolved.paragraph.borders.left?.color,'#123456');
  assert.equal(resolved.paragraph.borders.bottom?.style,'none');
});

test('tabs inherit by position, support replacement and clear, and empty arrays keep inheritance', () => {
  const project=createProject(), parent=addStyle(project,'Parent');
  parent.paragraph.tabs=[tab(1),tab(2,'right'),tab(3)];
  const child=addStyle(project,'Child','Parent');
  child.paragraph.tabs=[];
  assert.deepEqual(resolveStyle(project,child).paragraph.tabs,parent.paragraph.tabs);
  child.paragraph.tabs=[tab(1,'clear'),tab(2,'decimal','dot'),tab(4,'center')];
  assert.deepEqual(resolveStyle(project,child).paragraph.tabs,[tab(2,'decimal','dot'),tab(3),tab(4,'center')]);
  assert.equal(parent.paragraph.tabs.length,3);
});

test('inheritance validation catches a cycle and incompatible or missing bases', () => {
  const project=createProject(), first=addStyle(project,'First'), second=addStyle(project,'Second','First');
  assert.equal(canBaseOn(project,first,second),false);
  first.basedOn='Second';
  assert.throws(()=>validateProject(project),/循环/);
  assert.doesNotThrow(()=>resolveStyle(project,first));
  first.basedOn='Missing';
  assert.throws(()=>validateProject(project),/目标缺失/);
  first.basedOn=project.styles.find(s=>s.type==='character')!.id;
  assert.throws(()=>validateProject(project),/类型不兼容/);
});

test('deleting a style repairs inheritance, next paragraph, and numbering references', () => {
  const project=createProject(), parent=addStyle(project,'Parent'), child=addStyle(project,'Child','Parent');
  child.next=parent.id;
  project.lists[0].levels[4].linkedStyle=parent.id;
  const result=removeStyle(project,parent.id);
  const remaining=result.styles.find(s=>s.id===child.id)!;
  assert.equal(remaining.basedOn,'Normal');
  assert.equal(remaining.next,'Normal');
  assert.equal(result.lists[0].levels[4].linkedStyle,undefined);
  assert.doesNotThrow(()=>validateProject(result));
  assert.ok(project.styles.some(s=>s.id===parent.id));
  assert.equal(project.lists[0].levels[4].linkedStyle,parent.id);
  assert.equal(removeStyle(project,'Normal'),project);
  assert.equal(removeStyle(project,'Missing'),project);
});

test('validation accounts for IDs created for linked character companions and numbering styles', () => {
  const project=createProject();
  const explicit=addStyle(project,'Heading1Char');
  assert.throws(()=>validateProject(project),/字符样式冲突/);
  project.styles=project.styles.filter(s=>s!==explicit);
  project.lists[0].id='Heading1Char';
  assert.throws(()=>validateProject(project),/导出样式标识冲突/);
  project.lists[0].id='Heading1';
  assert.throws(()=>validateProject(project),/标识/);
});

test('duplicate IDs, whitespace names and invalid next styles are rejected', () => {
  const project=createProject(), style=addStyle(project,'Other');
  style.id='Normal';
  assert.throws(()=>validateProject(project),/唯一/);
  style.id='Other';style.name='   ';
  assert.throws(()=>validateProject(project),/不能为空/);
  style.name='Other';style.next='Missing';
  assert.throws(()=>validateProject(project),/后续段落样式不存在/);
  style.next='Normal';project.name=' ';
  assert.throws(()=>validateProject(project),/方案名称不能为空/);
});

test('Normal must stay an unnumbered independent paragraph style', () => {
  const project=createProject();
  project.styles[0].basedOn='Heading1';
  assert.throws(()=>validateProject(project),/无继承/);
  project.styles[0].basedOn=undefined;
  project.lists[0].levels[0].linkedStyle='Normal';
  assert.throws(()=>validateProject(project),/Normal.*不能关联编号/);
  assert.throws(()=>bindStyle(project,project.lists[0].id,0,'Normal'),/Normal/);
});

test('binding moves a paragraph style to exactly one level and rejects invalid targets', () => {
  const project=createProject(), before=structuredClone(project);
  const result=bindStyle(project,project.lists[0].id,4,'Heading1');
  assert.equal(result.lists[0].levels[0].linkedStyle,undefined);
  assert.equal(result.lists[0].levels[4].linkedStyle,'Heading1');
  assert.doesNotThrow(()=>validateProject(result));
  assert.deepEqual(project,before);
  assert.throws(()=>bindStyle(project,'Missing',0,'Heading1'),/不存在/);
  assert.throws(()=>bindStyle(project,project.lists[0].id,9,'Heading1'),/不存在/);
  assert.throws(()=>bindStyle(project,project.lists[0].id,0,project.styles.find(s=>s.type==='character')!.id),/段落样式不存在/);
  assert.equal(bindStyle(result,result.lists[0].id,4).lists[0].levels[4].linkedStyle,undefined);
});

test('list validation rejects invalid restart, future placeholders, and duplicate associations', () => {
  const project=createProject(), level=project.lists[0].levels[1];
  level.restart=2;
  assert.throws(()=>validateProject(project),/重新编号条件无效/);
  level.restart=1;level.text='%3';
  assert.throws(()=>validateProject(project),/当前级和上级/);
  level.text='%0';
  assert.throws(()=>validateProject(project),/当前级和上级/);
  level.text='%2';level.linkedStyle='Heading1';
  assert.throws(()=>validateProject(project),/只能关联一个/);
});

test('every configured numbering format has a concrete label', () => {
  const expected: Record<Level['format'],string> = {decimal:'3',decimalZero:'03',upperRoman:'III',lowerRoman:'iii',upperLetter:'C',lowerLetter:'c',chineseCounting:'三',chineseCountingThousand:'三',chineseLegalSimplified:'叁',ideographTraditional:'丙',ordinal:'3rd',cardinalText:'Three',ordinalText:'Third',bullet:'•',none:''};
  for(const format of numberFormats) assert.equal(formatNumber(3,format),expected[format],format);
});

test('Word alphabetic numbering repeats letters beyond Z', () => {
  assert.deepEqual([1,26,27,28,52,53].map(n=>formatNumber(n,'upperLetter')),['A','Z','AA','BB','ZZ','AAA']);
  assert.equal(formatNumber(28,'lowerLetter'),'bb');
  assert.equal(formatNumber(1994,'upperRoman'),'MCMXCIV');
  assert.equal(formatNumber(49,'lowerRoman'),'xlix');
  assert.equal(formatNumber(10,'decimalZero'),'10');
});

test('Chinese counting, thousand counting and legal numbering retain their distinct rules', () => {
  assert.deepEqual([10,11,20,99,100,101].map(n=>formatNumber(n,'chineseCounting')),['十','十一','二十','九十九','一○○','一○一']);
  assert.deepEqual([10,11,101,1001,10000,10001,32767].map(n=>formatNumber(n,'chineseCountingThousand')),['十','十一','一百零一','一千零一','一万','一万一','三万二千七百六十七']);
  assert.deepEqual([10,101,10001].map(n=>formatNumber(n,'chineseLegalSimplified')),['壹拾','壹佰零壹','壹萬零壹']);
  assert.deepEqual([10,11].map(n=>formatNumber(n,'ideographTraditional')),['癸','11']);
});

test('English numbering handles teen ordinals, compound words, and exact scales', () => {
  assert.deepEqual([1,2,3,11,12,13,21,112].map(n=>formatNumber(n,'ordinal')),['1st','2nd','3rd','11th','12th','13th','21st','112th']);
  assert.equal(formatNumber(123,'cardinalText'),'One hundred twenty-three');
  assert.equal(formatNumber(21,'ordinalText'),'Twenty-first');
  assert.equal(formatNumber(100,'ordinalText'),'One hundredth');
  assert.equal(formatNumber(1000,'ordinalText'),'One thousandth');
  assert.equal(formatNumber(1012,'ordinalText'),'One thousand twelfth');
  assert.equal(formatNumber(1000000,'cardinalText'),'');
  assert.equal(formatNumber(1000000,'chineseCountingThousand'),'');
  assert.throws(()=>formatNumber(-1,'decimal'),RangeError);
  assert.throws(()=>formatNumber(NaN,'decimal'),RangeError);
});

test('level labels use referenced formats and start values; legal mode uses decimal', () => {
  const list=createList();
  list.levels[0].format='upperRoman';list.levels[0].start=4;
  list.levels[1].format='lowerLetter';list.levels[1].start=2;
  list.levels[1].text='第 %1 章（%2）';
  assert.equal(levelLabel(list,1),'第 IV 章（b）');
  list.levels[1].legal=true;
  assert.equal(levelLabel(list,1,[5,3]),'第 5 章（3）');
  list.levels[1].format='bullet';list.levels[1].text='◆';
  assert.equal(levelLabel(list,1),'◆');
  list.levels[1].format='none';
  assert.equal(levelLabel(list,1),'');
  assert.throws(()=>levelLabel(list,9),RangeError);
});

test('simulated counters start at configured values and restart after the previous level', () => {
  const list=createList();
  list.levels[0].start=3;list.levels[1].start=5;list.levels[2].start=7;
  const before=structuredClone(list);
  const result=simulateList(list,[0,1,2,1,2,0,1,2]);
  assert.deepEqual(result.map(item=>item.label),['3','3.5','3.5.7','3.6','3.6.7','4','4.5','4.5.7']);
  assert.deepEqual(list,before);
  result[0].counters[0]=99;
  assert.equal(result[1].counters[0],3);
});

test('restart zero continues across ancestors, specified restart only reacts to its chosen level', () => {
  const list=createList();
  list.levels[2].restart=0;
  assert.deepEqual(simulateList(list,[0,1,2,1,2,0,1,2]).map(item=>item.label),['1','1.1','1.1.1','1.2','1.2.2','2','2.1','2.1.3']);
  list.levels[2].restart=1;
  assert.deepEqual(simulateList(list,[0,1,2,1,2,0,1,2]).map(item=>item.label),['1','1.1','1.1.1','1.2','1.2.2','2','2.1','2.1.1']);
  assert.throws(()=>simulateList(list,[-1]),RangeError);
});

test('zero starts and first use of a nested level do not accidentally increment unseen ancestors', () => {
  const list=createList();list.levels[0].start=0;list.levels[1].start=0;
  assert.deepEqual(simulateList(list,[1,1,0,1]).map(item=>item.label),['0.0','0.1','0','0.0']);
});

test('single-level lists validate types and simulate continuous items; legacy lists remain valid', () => {
 const p=createProject();delete p.lists[0].kind;validateProject(p);
 const bullet=createList('符号','bullet'),numbered=createList('编号','numbered');
 p.lists.push(bullet,numbered);validateProject(p);
 assert.deepEqual(simulateList(bullet,[0,0,0]).map(v=>v.label),['•','•','•']);
 numbered.levels[0].start=12;
 assert.deepEqual(simulateList(numbered,[0,0,0]).map(v=>v.label),['12.','13.','14.']);
 numbered.levels.push({...numbered.levels[0]});
 assert.throws(()=>validateProject(p),/单级列表需要一级/);
 numbered.levels.pop();numbered.levels[0].format='bullet';
 assert.throws(()=>validateProject(p),/类型与编号样式/);
});

test('deleting a missing style leaves a single-style project unchanged', () => {
  const project=createProject();
  project.styles=[{...createStyle('paragraph','唯一自定义样式'),id:'OnlyStyle',next:'OnlyStyle'}];
  project.lists=[];
  assert.equal(removeStyle(project,'MissingStyle'),project);
});

test('deleting the final custom style restores an unnumbered Normal and clears its list binding', () => {
  const project=createProject();
  project.styles=[{...createStyle('paragraph','唯一自定义样式'),id:'OnlyStyle',next:'OnlyStyle'}];
  project.lists=[createList('保留的列表')];
  project.lists[0].levels[0].linkedStyle='OnlyStyle';
  const result=validateProject(removeStyle(project,'OnlyStyle'));
  assert.deepEqual(result.styles.map(style=>style.id),['Normal']);
  assert.equal(result.lists[0].levels[0].linkedStyle,undefined);
  assert.equal(project.styles[0].id,'OnlyStyle');
  assert.equal(project.lists[0].levels[0].linkedStyle,'OnlyStyle');
});
