import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, createStyle, createList, resolveTableStyle, borderDefault, type Border } from '../src/model';
import { defaultTableLook, tableRegionsAt, tablePreviewSize, resolveTableCell } from '../src/tablePreview';
import { listTestSequence, parseListTestSequence, simulateList } from '../src/numbering';

const border=(color:string,style:Border['style']='single'):Border=>({...borderDefault,color,style});
test('table preview inherits region properties individually, including explicit false and none',()=>{
  const project=createProject(),parent=createStyle('table','父表格'),child=createStyle('table','子表格',parent.id);
  parent.table!.regions={firstRow:{run:{bold:true,color:'#ff0000'},paragraph:{before:6,borders:{top:border('#ff0000')},tabs:[{position:2,alignment:'left',leader:'none'}]},borders:{bottom:border('#ff0000'),insideV:border('#0000ff')},shading:'#eeeeee'}};
  child.table!.regions={firstRow:{run:{bold:false},paragraph:{after:8,borders:{bottom:border('#00ff00')},tabs:[{position:2,alignment:'clear',leader:'none'}]},borders:{bottom:border('#000000','none')}}};
  project.styles.push(parent,child);
  const before=JSON.stringify(project),table=resolveTableStyle(project,child)!;
  const cell=resolveTableCell(project,child,table,0,1,4,3,defaultTableLook);
  assert.equal(cell.run.bold,false);assert.equal(cell.run.color,'#ff0000');assert.equal(cell.shading,'#eeeeee');
  assert.equal(cell.paragraph.before,6);assert.equal(cell.paragraph.after,8);assert.equal(cell.paragraph.borders.top?.color,'#ff0000');assert.equal(cell.paragraph.borders.bottom?.color,'#00ff00');assert.deepEqual(cell.paragraph.tabs,[]);
  assert.equal(cell.borders.bottom.style,'none');assert.equal(cell.borders.left.color,'#0000ff');
  assert.equal(JSON.stringify(project),before);
  delete child.table!.regions.firstRow;
  assert.equal(resolveTableStyle(project,child)!.regions.firstRow!.run.bold,true);
});
test('table preview uses band sizes and enabled look options, with corner precedence',()=>{
  const project=createProject(),style=createStyle('table','条带');project.styles.push(style);
  const table=style.table!;table.rowBandSize=3;table.colBandSize=2;
  table.regions={band1Horz:{run:{},paragraph:{},shading:'#ff0000'},band2Horz:{run:{},paragraph:{},shading:'#ffff00'},band1Vert:{run:{},paragraph:{},shading:'#0000ff'},firstRow:{run:{},paragraph:{},shading:'#00ff00'},nwCell:{run:{},paragraph:{},shading:'#000000'}};
  assert.deepEqual(tablePreviewSize(table,defaultTableLook),{rows:8,cols:6});
  for(const row of [1,2,3])assert.ok(tableRegionsAt(table,row,1,8,6,defaultTableLook).includes('band1Horz'));
  for(const row of [4,5,6])assert.ok(tableRegionsAt(table,row,1,8,6,defaultTableLook).includes('band2Horz'));
  assert.ok(!tableRegionsAt(table,0,0,8,6,defaultTableLook).includes('band1Horz'));
  assert.equal(resolveTableCell(project,style,table,1,1,8,6,defaultTableLook).shading,'#0000ff');
  assert.equal(resolveTableCell(project,style,table,0,0,8,6,defaultTableLook).shading,'#000000');
  const look={...defaultTableLook,firstRow:false,firstCol:false,vertical:false};
  assert.equal(resolveTableCell(project,style,table,0,0,8,6,look).shading,'#ff0000');
  assert.ok(tableRegionsAt(table,3,0,8,6,look).includes('band2Horz'));
});
test('conditional borders distinguish a region perimeter from interior cell edges',()=>{
  const project=createProject(),style=createStyle('table','边框');project.styles.push(style);
  const table=style.table!;table.regions={firstRow:{run:{},paragraph:{},borders:{top:border('#ff0000'),bottom:border('#ff0000'),left:border('#00ff00'),right:border('#00ff00'),insideV:border('#0000ff')}},band1Horz:{run:{},paragraph:{},borders:{top:border('#ff0000'),bottom:border('#ff0000'),insideH:border('#0000ff')}}};
  table.rowBandSize=2;
  const middle=resolveTableCell(project,style,table,0,1,6,3,defaultTableLook);
  assert.equal(middle.borders.top.color,'#ff0000');assert.equal(middle.borders.left.color,'#0000ff');assert.equal(middle.borders.right.color,'#0000ff');
  assert.equal(resolveTableCell(project,style,table,0,0,6,3,defaultTableLook).borders.left.color,'#00ff00');
  const firstBand=resolveTableCell(project,style,table,1,1,6,3,defaultTableLook),lastBand=resolveTableCell(project,style,table,2,1,6,3,defaultTableLook);
  assert.equal(firstBand.borders.top.color,'#ff0000');assert.equal(firstBand.borders.bottom.color,'#0000ff');
  assert.equal(lastBand.borders.top.color,'#0000ff');assert.equal(lastBand.borders.bottom.color,'#ff0000');
});
test('cell paragraph styles override only specified properties without hiding cell fill',()=>{
  const project=createProject(),style=createStyle('table','表格'),content=createStyle('paragraph','单元格');
  style.run={bold:true,color:'#ff0000'};style.table!.regions={};style.table!.shading='#eeeeee';content.paragraph={alignment:'right'};
  project.styles.push(style,content);
  const cell=resolveTableCell(project,style,style.table!,1,1,4,3,defaultTableLook,content);
  assert.equal(cell.run.bold,true);assert.equal(cell.run.color,'#ff0000');assert.equal(cell.paragraph.alignment,'right');assert.equal(cell.paragraphShading,undefined);
  content.paragraph.shading='#ffffff';assert.equal(resolveTableCell(project,style,style.table!,1,1,4,3,defaultTableLook,content).paragraphShading,'#ffffff');
});
test('nine-level scenarios exercise deep continuation, restart and never-restart rules',()=>{
  const list=createList();
  assert.deepEqual([...new Set(listTestSequence(list))].sort(),[0,1,2,3,4,5,6,7,8]);
  for(const level of [6,7,8]){
    assert.deepEqual(simulateList(list,listTestSequence(list,'continue',level)).filter(x=>x.level===level).map(x=>x.counters[level]),[1,2,3]);
    assert.deepEqual(simulateList(list,listTestSequence(list,'restart',level)).filter(x=>x.level===level).map(x=>x.counters[level]),[1,2,1]);
  }
  list.levels[8].restart=0;list.levels[8].start=5;
  assert.deepEqual(simulateList(list,listTestSequence(list,'restart',8)).filter(x=>x.level===8).map(x=>x.counters[8]),[5,6,7]);
  list.levels[8].restart=2;
  assert.deepEqual(simulateList(list,listTestSequence(list,'restart',8)).filter(x=>x.level===8).map(x=>x.counters[8]),[5,6,5]);
  assert.deepEqual(listTestSequence(createList('编号','numbered')),[0,0,0,0]);
});
test('custom sequences accept Chinese separators and reject invalid or excessive entries',()=>{
  assert.deepEqual(parseListTestSequence('1，2、9; 9\n1',9),[0,1,8,8,0]);
  for(const text of ['', '0,1','10','1.5','1x','-1'])assert.throws(()=>parseListTestSequence(text,9));
  assert.throws(()=>parseListTestSequence('1,2',1));
  assert.throws(()=>parseListTestSequence(Array(101).fill(1).join(','),9),/100/);
});
