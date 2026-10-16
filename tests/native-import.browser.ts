import {createProject,createStyle,resolveStyle} from '../src/model';
import {exportDocument} from '../src/export';
import {importWord} from '../src/import';
import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate';
const lines:string[]=[];
function equal(actual:unknown,expected:unknown){if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);}
function native(project:ReturnType<typeof createProject>){const files=unzipSync(exportDocument(project));delete files['word/style-studio.json'];return importWord(zipSync(files)).project;}
try{
 const p=createProject();const restored=native(p);
 for(const id of ['FigureParagraph','BodyNumber1','BodyNumber2','ReportBody']){
  const before=resolveStyle(p,p.styles.find(s=>s.id===id)!).paragraph;
  const after=resolveStyle(restored,restored.styles.find(s=>s.id===id)!).paragraph;
  equal(after.spacingUnit,before.spacingUnit);equal(after.before,before.before);equal(after.after,before.after);equal(after.indentUnit,before.indentUnit);
  for(const key of ['left','right','firstLine'] as const)if(Math.abs(after[key]-before[key])>.002)throw Error(id+' '+key);
 }
 lines.push('PASS native report XML: 6 pt spacing, cm list indents, 2 character first line');
 for(const reverse of [false,true]){
  const project=createProject();const base=createStyle('paragraph','Base');base.id='TestBase';base.next='ReportBody';
  base.paragraph={indentUnit:reverse?'cm':'char',left:2,right:1,firstLine:reverse?1:-2,spacingUnit:reverse?'pt':'line',before:2,after:3};
  base.run={bold:true};
  const child=createStyle('paragraph','Child',base.id);child.id='TestChild';child.next='ReportBody';
  child.paragraph={indentUnit:reverse?'char':'cm',firstLine:reverse?-2:1,spacingUnit:reverse?'line':'pt',before:6};
  project.styles.push(base,child);const imported=native(project);
  const effective=resolveStyle(imported,imported.styles.find(s=>s.id===child.id)!);
  equal(effective.paragraph.indentUnit,child.paragraph.indentUnit);equal(effective.paragraph.spacingUnit,child.paragraph.spacingUnit);
  equal(effective.paragraph.before,6);equal(effective.paragraph.after,3);equal(effective.run.bold,true);
  if(Math.abs(effective.paragraph.firstLine-child.paragraph.firstLine!)>.002)throw Error('direction');
 }
 lines.push('PASS inherited unit/direction changes in both directions and retained bold');
 const files=unzipSync(exportDocument(p));delete files['word/style-studio.json'];
 let styles=strFromU8(files['word/styles.xml']);styles=styles.replace('w:firstLineChars="200"','w:firstLineChars="200" w:hangingChars="0"');
 files['word/styles.xml']=strToU8(styles);const conflict=importWord(zipSync(files)).project;
 equal(conflict.styles.find(s=>s.id==='ReportBody')!.paragraph.firstLine,0);
 lines.push('PASS explicit zero hanging has priority during native import');
 document.querySelector('#result')!.textContent=lines.join('\n')+'\nALL PASSED';
}catch(error){document.querySelector('#result')!.textContent=lines.join('\n')+'\nFAILED: '+String(error);throw error;}
