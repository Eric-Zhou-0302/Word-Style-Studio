import { z } from 'zod';

const num = (min: number, max: number) => z.number().finite().min(min).max(max);
const text = z.string().max(255).refine(s => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(s), '文本包含无效字符');
const id = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,79}$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const runSchema = z.object({
  font: text.optional(), latinFont: text.optional(), size: num(1, 1638).optional(), color: color.optional(),
  bold: z.boolean().optional(), italic: z.boolean().optional(),
  underline: z.enum(['none','single','double','dotted','dash','wave','words']).optional(),
  underlineColor: color.optional(), shading: color.optional(),
  outline: z.boolean().optional(), shadow: z.boolean().optional(), emboss: z.boolean().optional(), imprint: z.boolean().optional(), noProof: z.boolean().optional(),
  ligatures: z.enum(['none','standard','contextual','historical','discretional','standardContextual','standardHistorical','contextualHistorical','standardDiscretional','contextualDiscretional','historicalDiscretional','standardContextualHistorical','standardContextualDiscretional','standardHistoricalDiscretional','contextualHistoricalDiscretional','all']).optional(),
  numForm: z.enum(['default','lining','oldStyle']).optional(), numSpacing: z.enum(['default','proportional','tabular']).optional(), contextualAlternates: z.boolean().optional(),
  strike: z.enum(['none','single','double']).optional(), caps: z.boolean().optional(), smallCaps: z.boolean().optional(),
  script: z.enum(['baseline','superscript','subscript']).optional(),
  spacing: num(-20,100).optional(), scale: num(1,600).optional(), position: num(-100,100).optional(), kerning: num(0,1638).optional(),
  highlight: z.enum(['none','yellow','green','cyan','magenta','blue','red','darkBlue','darkCyan','darkGreen','darkMagenta','darkRed','darkYellow','darkGray','lightGray','black','white']).optional(),
  hidden: z.boolean().optional(), language: z.enum(['zh-CN','zh-TW','en-US','en-GB','ja-JP']).optional(),
}).strict();
export const borderSchema = z.object({ style: z.enum(['none','single','double','dotted','dashed','thick']), color, width: num(0.25,12), space: num(0,31) }).strict();
export const bordersSchema = z.object({ top: borderSchema.optional(), bottom: borderSchema.optional(), left: borderSchema.optional(), right: borderSchema.optional(), between: borderSchema.optional(), insideH: borderSchema.optional(), insideV: borderSchema.optional() }).strict();
export const tabSchema = z.object({ position: num(0,55), alignment: z.enum(['left','center','right','decimal','bar','clear']), leader: z.enum(['none','dot','hyphen','underscore','heavy','middleDot']) }).strict();
export const paragraphSchema = z.object({
  alignment: z.enum(['left','center','right','both','distribute']).optional(),
  left: num(-20,55).optional(), right: num(-20,55).optional(), firstLine: num(-20,55).optional(),
  indentUnit: z.enum(['cm','char']).optional(),
  before: num(0,1584).optional(), after: num(0,1584).optional(),
  spacingUnit: z.enum(['pt','line']).optional(), beforeAuto: z.boolean().optional(), afterAuto: z.boolean().optional(),
  lineRule: z.enum(['auto','exact','atLeast']).optional(), line: num(0.1,1584).optional(),
  contextualSpacing: z.boolean().optional(), keepNext: z.boolean().optional(), keepLines: z.boolean().optional(),
  pageBreakBefore: z.boolean().optional(), widowControl: z.boolean().optional(), suppressLineNumbers: z.boolean().optional(), suppressAutoHyphens: z.boolean().optional(),
  snapToGrid: z.boolean().optional(), overflowPunct: z.boolean().optional(), autoSpaceDE: z.boolean().optional(), autoSpaceDN: z.boolean().optional(),
  kinsoku: z.boolean().optional(), wordWrap: z.boolean().optional(), mirrorIndents: z.boolean().optional(), bidi: z.boolean().optional(), textAlignment: z.enum(['auto','top','center','baseline','bottom']).optional(),
  outlineLevel: num(0,9).int().optional(), shading: color.optional(), borders: bordersSchema.optional(), tabs: z.array(tabSchema).max(64).optional(),
}).strict();
export const regionNames = ['firstRow','lastRow','firstCol','lastCol','band1Horz','band2Horz','band1Vert','band2Vert','nwCell','neCell','swCell','seCell'] as const;
export const tableRegionSchema = z.object({ run: runSchema, paragraph: paragraphSchema, borders: bordersSchema.optional(), shading: color.optional(), verticalAlign: z.enum(['top','center','bottom']).optional() }).strict();
export const tableSchema = z.object({
  alignment: z.enum(['left','center','right']), cellMargin: num(0,5), cellMargins: z.object({top:num(0,5),bottom:num(0,5),left:num(0,5),right:num(0,5)}).strict().optional(), cellSpacing: num(0,5),
  rowBandSize: num(1,3).int(), colBandSize: num(1,3).int(), border: borderSchema,
  shading: color, verticalAlign: z.enum(['top','center','bottom']),
  regions: z.partialRecord(z.enum(regionNames), tableRegionSchema),
}).strict();
export const styleSchema = z.object({
  id, name: text.min(1), type: z.enum(['paragraph','character','linked','table']),
  basedOn: id.optional(), next: id.optional(), quickFormat: z.boolean(), priority: num(0,99).int(),
  hidden: z.boolean(), unhideWhenUsed: z.boolean(), autoUpdate: z.boolean(), aliases: text,
  run: runSchema, paragraph: paragraphSchema, table: tableSchema.optional(),
}).strict();
export const numberFormats = ['decimal','decimalZero','upperRoman','lowerRoman','upperLetter','lowerLetter','chineseCounting','chineseCountingThousand','chineseLegalSimplified','ideographTraditional','ordinal','cardinalText','ordinalText','bullet','none'] as const;
export const levelSchema = z.object({
  format: z.enum(numberFormats), text: text.min(1), start: num(0,32767).int(), restart: num(0,8).int(),
  linkedStyle: id.optional(), legal: z.boolean(), alignment: z.enum(['left','center','right']),
  follow: z.enum(['tab','space','nothing']), indent: num(0,55), hanging: num(-20,55), tabPosition: num(0,55), run: runSchema,
  picture: z.object({ data: z.string().max(1400000).regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/), width: num(1,100), height: num(1,100) }).strict().optional(),
}).strict();
export const listSchema = z.object({ id, name: text.min(1), listNumName: text.optional(), galleryLevel: num(0,8).int().optional(), kind: z.enum(['multilevel','bullet','numbered']).optional(), levels: z.array(levelSchema).min(1).max(9) }).strict();
export const projectSchema = z.object({
  version: z.literal(1), name: text.min(1),
  page: z.object({ size: z.enum(['A4','A5','Letter']), orientation: z.enum(['portrait','landscape']), top: num(0,10), bottom: num(0,10), left: num(0,10), right: num(0,10), gutter: num(0,5), header:num(0,10).optional(), footer:num(0,10).optional(), defaultTab: num(0.1,10) }).strict(),
  styles: z.array(styleSchema).min(1).max(200), lists: z.array(listSchema).max(30),
}).strict();

export type Run = z.infer<typeof runSchema>;
export type Paragraph = z.infer<typeof paragraphSchema>;
export type Border = z.infer<typeof borderSchema>;
export type Borders = z.infer<typeof bordersSchema>;
export type TabStop = z.infer<typeof tabSchema>;
export type Table = z.infer<typeof tableSchema>;
export type TableRegion = z.infer<typeof tableRegionSchema>;
export type Style = z.infer<typeof styleSchema>;
export type Level = z.infer<typeof levelSchema>;
export type List = z.infer<typeof listSchema>;
export type Project = z.infer<typeof projectSchema>;

export const baseRun: Required<Run> = {font:'宋体',latinFont:'Times New Roman',size:12,color:'#202625',bold:false,italic:false,underline:'none',underlineColor:'#202625',shading:'#ffffff',outline:false,shadow:false,emboss:false,imprint:false,noProof:false,ligatures:'none',numForm:'default',numSpacing:'default',contextualAlternates:false,strike:'none',caps:false,smallCaps:false,script:'baseline',spacing:0,scale:100,position:0,kerning:0,highlight:'none',hidden:false,language:'zh-CN'};
export const baseParagraph: Required<Paragraph> = {alignment:'both',left:0,right:0,firstLine:0,indentUnit:'cm',spacingUnit:'pt',beforeAuto:false,afterAuto:false,before:0,after:0,lineRule:'auto',line:1.5,contextualSpacing:false,keepNext:false,keepLines:false,pageBreakBefore:false,widowControl:true,suppressLineNumbers:false,suppressAutoHyphens:false,snapToGrid:false,overflowPunct:true,autoSpaceDE:true,autoSpaceDN:true,kinsoku:true,wordWrap:false,mirrorIndents:false,bidi:false,textAlignment:'auto',outlineLevel:9,shading:'#ffffff',borders:{},tabs:[]};
export const typeLabels: Record<Style['type'],string> = {paragraph:'段落',character:'字符',linked:'链接（段落与字符）',table:'表格'};
export const formatLabels: Record<Level['format'],string> = {decimal:'1, 2, 3',decimalZero:'01, 02, 03',upperRoman:'I, II, III',lowerRoman:'i, ii, iii',upperLetter:'A, B, C',lowerLetter:'a, b, c',chineseCounting:'一、二、三',chineseCountingThousand:'一、十一、二十一',chineseLegalSimplified:'壹、贰、叁',ideographTraditional:'甲、乙、丙',ordinal:'1st, 2nd, 3rd',cardinalText:'One, Two, Three',ordinalText:'First, Second, Third',bullet:'项目符号',none:'无编号'};
export const fonts = ['宋体','黑体','楷体','仿宋','仿宋_GB2312','方正小标宋简体','微软雅黑','等线','思源宋体','思源黑体','PingFang SC','SimSun','Arial','Calibri','Aptos','Times New Roman','Georgia'];
export const borderDefault: Border = {style:'single',color:'#cbd3cf',width:0.5,space:0};
export const tableDefault: Table = {alignment:'left',cellMargin:0.15,cellSpacing:0,rowBandSize:1,colBandSize:1,border:{...borderDefault},shading:'#ffffff',verticalAlign:'center',regions:{firstRow:{run:{bold:true,color:'#ffffff'},paragraph:{},shading:'#155b49'},band1Horz:{run:{},paragraph:{},shading:'#f1f5f3'}}};
export function makeId(prefix = 'Style') { return prefix + crypto.randomUUID().replaceAll('-','').slice(0,16); }
export function createStyle(type: Style['type'], name: string, basedOn?: string): Style {
  return {id:makeId(),name,type,basedOn,next:type==='paragraph'||type==='linked'?'Normal':undefined,quickFormat:true,priority:20,hidden:false,unhideWhenUsed:false,autoUpdate:false,aliases:'',run:{},paragraph:{},...(type==='table'?{table:structuredClone(tableDefault)}:{})};
}
export type ListKind = 'multilevel'|'bullet'|'numbered';
export const listKindLabels = {multilevel:'多级列表',bullet:'项目符号',numbered:'编号列表'};
export function listKind(list:List):ListKind { return list.kind??'multilevel'; }
export function createList(name='新多级列表', kind:ListKind='multilevel'): List {
  return {id:makeId('List'),name,kind,levels:Array.from({length:kind==='multilevel'?9:1},(_,i)=>({format:kind==='bullet'?'bullet':'decimal',text:kind==='bullet'?'•':kind==='numbered'?'%1.':Array.from({length:i+1},(_,n)=>`%${n+1}`).join('.'),start:1,restart:i,legal:false,alignment:'left',follow:'tab',indent:0.75*(i+1),hanging:0.75,tabPosition:0.75*(i+1),run:{}}))};
}
export function createBlankProject():Project {
  return {version:1,name:'未命名方案',
    page:{size:'A4',orientation:'portrait',top:2.54,bottom:2.54,left:2.54,right:2.54,header:1.27,footer:1.27,gutter:0,defaultTab:1.27},
    styles:[{...createStyle('paragraph','正文'),id:'Normal',next:'Normal',priority:0}],lists:[]};
}
export function createProject(): Project {
  const normal:Style={...createStyle('paragraph','正文'),id:'Normal',priority:99,quickFormat:false,next:'Normal',run:{font:'楷体',size:14,color:'#000000'},paragraph:{alignment:'both',lineRule:'auto',line:1,before:0,after:0,firstLine:0,keepLines:true}};
  const paragraph=(id:string,name:string,run:Run={},paragraph:Paragraph={},next='ReportBody'):Style=>({
    ...createStyle('paragraph',name),id,next,run:{...normal.run,...run},paragraph:{...normal.paragraph,...paragraph},
  });
  const centered:Paragraph={alignment:'center',left:0,right:0,firstLine:0};
  const rows:Style[]=[
    paragraph('ReportTitle','报告标题',{font:'宋体',size:26,bold:true},{...centered,line:1.5}),
    paragraph('ReportSubtitle','报告副标题',{size:16},{...centered,line:1.5}),
    paragraph('Signature','落款',{size:16,bold:true},{alignment:'right',line:1.15}),
    paragraph('TocTitle','目录标题',{size:18,bold:true},{...centered,keepNext:true}),
    ...[0,1,2].map(i=>paragraph('Toc'+(i+1),['目录一级','目录二级','目录三级'][i],{font:i===0?'黑体':'楷体',size:16-i,bold:true},{alignment:'left',left:[0,.74,1.48][i],tabs:[{position:16,alignment:'right',leader:'dot'}]})),
    ...[0,1,2,3,4,5].map(i=>paragraph('Heading'+(i+1),['一级标题','二级标题','三级标题','四级标题','五级标题','六级标题'][i],{font:i===0?'黑体':'楷体',size:[16,15,14,14,14,14][i],bold:i<3},{alignment:'left',before:[12,8,5,0,0,0][i],after:[12,8,5,0,0,0][i],outlineLevel:i,keepNext:true,left:i<2?0:1.73,firstLine:i<2?0:-.74})),
    paragraph('ReportBody','报告正文',{}, {indentUnit:'char',firstLine:2}),
    paragraph('ReportBodyPlain','报告正文无缩进'),
    paragraph('BodyNumber1','正文编号一级',{}, {left:1.73,firstLine:-.74},'BodyNumber1'),
    paragraph('BodyNumber2','正文编号二级',{}, {left:2.47,firstLine:-.74},'BodyNumber2'),
    paragraph('BodyBullet','正文项目符号',{}, {left:1.73,firstLine:-.74},'BodyBullet'),
    paragraph('TableCaption','表题',{size:10.5,bold:true},{...centered,before:5,after:5,keepNext:true}),
    paragraph('FigureCaption','图题',{size:10.5,bold:true},{...centered,before:5,after:5,keepNext:true}),
    paragraph('FigureParagraph','独立图表段',{size:10.5},centered),
    paragraph('Source','资料来源',{size:10.5,color:'#595959'},{alignment:'left',after:5}),
    paragraph('FootnoteText','脚注',{size:10.5},{alignment:'left'}),
    paragraph('TableHeader','表格表头',{size:12,bold:true},centered,'TableHeader'),
    paragraph('TableBodyCenter','表格表体居中',{size:12},centered,'TableBodyCenter'),
    paragraph('TableBodyLeft','表格表体左对齐',{size:12},{alignment:'left'},'TableBodyLeft'),
    paragraph('TableBodyRight','表格表体右对齐',{size:12},{alignment:'right'},'TableBodyRight'),
    paragraph('TableFooter','表格表尾',{size:12,bold:true},centered,'TableFooter'),
    {...createStyle('table','标准表格'),id:'StandardTable',run:{},paragraph:{},table:{...structuredClone(tableDefault),cellMargin:.14,cellMargins:{top:.14,bottom:.14,left:.18,right:.18},border:{style:'single',color:'#000000',width:.5,space:0},shading:'#ffffff',verticalAlign:'center',regions:{}}},
  ];
  rows.forEach((style,i)=>style.priority=i+1);
  const headings=createList('标题层级');headings.id='Headings';
  const formats:Level['format'][]=['chineseCounting','chineseCounting','decimal','decimal','upperLetter','lowerLetter'];
  const texts=['%1、','（%2）','%3.','（%4）','%5.','%6.'];
  headings.levels.forEach((l,i)=>{if(i<6)Object.assign(l,{format:formats[i],text:texts[i],linkedStyle:'Heading'+(i+1),indent:i<2?0:1.73,hanging:i<2?0:.74,tabPosition:i<2?0:1.73,follow:i===2?'tab':'nothing'});});
  const body=createList('正文编号');body.id='BodyNumbering';
  body.levels.slice(0,2).forEach((l,i)=>Object.assign(l,{text:i===0?'%1、':'（%2）',linkedStyle:'BodyNumber'+(i+1),indent:i===0?1.73:2.47,hanging:.74,tabPosition:i===0?1.73:2.47,follow:'nothing'}));
  const bullets=createList('正文项目符号','bullet');bullets.id='BodyBullets';
  Object.assign(bullets.levels[0],{text:'•',linkedStyle:'BodyBullet',indent:1.73,hanging:.74,tabPosition:1.73,follow:'tab',run:{color:'#000000'}});
  return {version:1,name:'通用报告样式方案',page:{size:'A4',orientation:'portrait',top:2.75,bottom:2.75,left:2.5,right:2.5,header:1.5,footer:1.5,gutter:0,defaultTab:1.27},styles:rows,lists:[headings,body,bullets]};
}

export function styleChain(project: Project, style: Style): Style[] {
  const chain:Style[]=[]; const seen=new Set<string>(); let current:Style|undefined=style;
  while(current&&!seen.has(current.id)){seen.add(current.id);chain.unshift(current);current=project.styles.find(s=>s.id===current?.basedOn);}
  return chain;
}
export function mergeParagraph<T extends Paragraph>(base:T, changes:Paragraph):T {
  const tabs=new Map((base.tabs??[]).map(t=>[Math.round(t.position*1440/2.54),t]));
  for(const tab of changes.tabs??[]){const key=Math.round(tab.position*1440/2.54);if(tab.alignment==='clear')tabs.delete(key);else tabs.set(key,tab);}
  return {...base,...Object.fromEntries(Object.entries(changes).filter(([,v])=>v!==undefined)),
    borders:{...base.borders,...Object.fromEntries(Object.entries(changes.borders??{}).filter(([,v])=>v!==undefined))},
    tabs:[...tabs.values()].sort((a,b)=>a.position-b.position)};
}
export function resolveTableStyle(project:Project, style:Style):Table|undefined {
  let table:Table|undefined;
  for(const entry of styleChain(project,style)){
    if(!entry.table)continue;
    const regions:Table['regions']=structuredClone(table?.regions??{});
    for(const name of regionNames){
      const next=entry.table.regions[name];if(!next)continue;
      const previous=regions[name];
      regions[name]={...previous,...Object.fromEntries(Object.entries(next).filter(([,v])=>v!==undefined)),
        run:{...previous?.run,...Object.fromEntries(Object.entries(next.run).filter(([,v])=>v!==undefined))},
        paragraph:mergeParagraph(previous?.paragraph??{},next.paragraph),
        borders:{...previous?.borders,...Object.fromEntries(Object.entries(next.borders??{}).filter(([,v])=>v!==undefined))}};
    }
    // 整表字段在模型中为显式值；只有缺省区域和区域内缺省属性继承。
    table={...structuredClone(entry.table),regions};
  }
  return table;
}
export function resolveStyle(project: Project, style: Style): { run: Required<Run>; paragraph: Required<Paragraph> } {
  const chain=styleChain(project,style);
  const run=structuredClone(baseRun), paragraph=structuredClone(baseParagraph);
  const tabs=new Map<number,TabStop>();
  for(const entry of chain){
    // UI 以绝对设置表示覆盖，显式 false 必须覆盖 true，undefined 则继续继承。
    Object.assign(run,Object.fromEntries(Object.entries(entry.run).filter(([,value])=>value!==undefined)));
    const {borders, tabs:changes, ...properties}=entry.paragraph;
    Object.assign(paragraph,Object.fromEntries(Object.entries(properties).filter(([,value])=>value!==undefined)));
    if(borders)Object.assign(paragraph.borders,structuredClone(Object.fromEntries(Object.entries(borders).filter(([,value])=>value!==undefined))));
    // Word 按制表位位置合并；空数组不清空父样式，clear 才删除对应位置。
    for(const tab of changes??[]){const key=Math.round(tab.position*1440/2.54);if(tab.alignment==='clear')tabs.delete(key);else tabs.set(key,{...tab});}
  }
  paragraph.tabs=[...tabs.values()].sort((a,b)=>a.position-b.position);
  return {run,paragraph};
}
export function paragraphStyle(s:Style){return s.type==='paragraph'||s.type==='linked';}
export function compatibleBase(s:Style,t:Style){return s.id!==t.id && (paragraphStyle(s)?paragraphStyle(t):s.type===t.type);}
export function canBaseOn(project:Project,style:Style,candidate:Style){
  if(!compatibleBase(style,candidate))return false;let current:Style|undefined=candidate;const seen=new Set<string>();
  while(current){if(current.id===style.id||seen.has(current.id))return false;seen.add(current.id);current=project.styles.find(s=>s.id===current?.basedOn);}return true;
}
export function validateProject(input:unknown): Project {
  const result=projectSchema.safeParse(input);
  if(!result.success)throw new Error('方案格式不正确：'+result.error.issues.slice(0,3).map(i=>`${i.path.join('.')} ${i.message}`).join('；'));
  const p=result.data; const ids=new Set<string>();const names=new Set<string>();
  if(!p.name.trim())throw new Error('方案名称不能为空');
  for(const s of p.styles){if(ids.has(s.id)||names.has(s.name.trim()))throw new Error('样式的名称和标识必须唯一');ids.add(s.id);names.add(s.name.trim());if(!s.name.trim())throw new Error('样式名称不能为空');if(s.name.includes(','))throw new Error('样式名称不能包含英文逗号，请在别名中使用逗号分隔');}
  if(p.styles.some(s=>s.id==='Normal'&&(s.type!=='paragraph'||!!s.basedOn)))throw new Error('方案必须保留无继承的正文（Normal）样式');
  // 链接样式导出的字符副本也使用独立 ID，提前检查防止冲突。
  const exportedIds=new Set([...ids,'Normal']);
  for(const s of p.styles){if(s.type==='linked'){const companion=`${s.id}Char`;if(exportedIds.has(companion))throw new Error('样式标识与链接字符样式冲突');exportedIds.add(companion);}if(s.basedOn){const base=p.styles.find(x=>x.id===s.basedOn);if(!base||!canBaseOn(p,s,base))throw new Error('样式继承存在循环、类型不兼容或目标缺失');}if(s.next&&!p.styles.some(x=>x.id===s.next&&paragraphStyle(x)))throw new Error('后续段落样式不存在');}
  const linked=new Set<string>();const listIds=new Set<string>();const listNames=new Set<string>();
  for(const list of p.lists){if(list.levels.length!==(listKind(list)==='multilevel'?9:1))throw new Error('多级列表需要九级，单级列表需要一级');if((list.galleryLevel??0)>=list.levels.length)throw new Error('列表默认级别不存在');if(listKind(list)==='bullet'&&list.levels[0].format!=='bullet'||listKind(list)==='numbered'&&['bullet','none'].includes(list.levels[0].format))throw new Error('列表类型与编号样式不一致');if(exportedIds.has(list.id)||listIds.has(list.id)||listNames.has(list.name.trim())||!list.name.trim())throw new Error('列表名称和标识必须唯一且非空，且不能与导出样式标识冲突');if(list.name.includes(','))throw new Error('列表样式名称不能包含英文逗号');listIds.add(list.id);listNames.add(list.name.trim());list.levels.forEach((l,i)=>{if(l.restart>i)throw new Error(`第 ${i+1} 级的重新编号条件无效`);if(l.linkedStyle){if(l.linkedStyle==='Normal')throw new Error('正文（Normal）不能关联编号，以保留真正的空白文档');if(!p.styles.some(s=>s.id===l.linkedStyle&&paragraphStyle(s)))throw new Error('列表关联了不存在的段落样式');if(linked.has(l.linkedStyle))throw new Error('同一样式只能关联一个列表层级');linked.add(l.linkedStyle);}for(const match of l.text.matchAll(/%([0-9]+)/g)){const n=Number(match[1]);if(n<1||n>i+1)throw new Error(`第 ${i+1} 级只能引用当前级和上级编号`);}});}
  const size=p.page.size==='A4'?[21,29.7]:p.page.size==='A5'?[14.8,21]:[21.59,27.94];if(p.page.orientation==='landscape')size.reverse();
  if(p.page.left+p.page.right+p.page.gutter>=size[0]-1||p.page.top+p.page.bottom>=size[1]-1)throw new Error('页边距过大，页面没有足够的正文区域');
  return p;
}
export function bindStyle(project:Project,listId:string,index:number,styleId?:string):Project {
  const list=project.lists.find(item=>item.id===listId);
  if(!list||!Number.isInteger(index)||index<0||index>=list.levels.length)throw new Error('关联的列表级别不存在');
  if(styleId==='Normal')throw new Error('正文（Normal）不能关联编号');
  if(styleId&&!project.styles.some(style=>style.id===styleId&&paragraphStyle(style)))throw new Error('关联的段落样式不存在');
  return {...project,lists:project.lists.map(list=>({...list,levels:list.levels.map((level,i)=>({...level,linkedStyle:list.id===listId&&i===index?styleId:styleId&&level.linkedStyle===styleId?undefined:level.linkedStyle}))}))};
}
export function removeStyle(project:Project,id:string):Project {
  if(id==='Normal')return project;
  const removed=project.styles.find(s=>s.id===id);
  if(!removed)return project;
  if(project.styles.length===1)return {...project,styles:createBlankProject().styles,lists:project.lists.map(l=>({...l,levels:l.levels.map(v=>({...v,linkedStyle:v.linkedStyle===id?undefined:v.linkedStyle}))}))};
  return {...project,styles:project.styles.filter(s=>s.id!==id).map(s=>({...s,basedOn:s.basedOn===id?removed?.basedOn:s.basedOn,next:s.next===id?(project.styles.some(v=>v.id==='Normal')?'Normal':s.id):s.next})),lists:project.lists.map(l=>({...l,levels:l.levels.map(v=>({...v,linkedStyle:v.linkedStyle===id?undefined:v.linkedStyle}))}))};
}
