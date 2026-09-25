import { mergeParagraph, resolveStyle, styleChain, type Border, type Project, type Style, type Table } from './model';

export type TableLook = { firstRow:boolean; lastRow:boolean; firstCol:boolean; lastCol:boolean; horizontal:boolean; vertical:boolean };
export const defaultTableLook:TableLook={firstRow:true,lastRow:true,firstCol:true,lastCol:true,horizontal:true,vertical:true};
type Region=keyof Table['regions'];
export type CellBorders=Record<'top'|'bottom'|'left'|'right',Border>;

export function tableRegionsAt(table:Table,row:number,col:number,rows:number,cols:number,look:TableLook):Region[]{
  if(row<0||col<0||row>=rows||col>=cols)return [];
  const keys:Region[]=[];
  // Word 的条件格式顺序：行条带、列条带、首末列、首末行、四角。
  // 启用的标题/末行和首/末列不计入条带组。
  const rowStart=look.firstRow?1:0,colStart=look.firstCol?1:0;
  if(look.horizontal&&row>=rowStart&&row<rows-(look.lastRow?1:0))keys.push(Math.floor((row-rowStart)/table.rowBandSize)%2===0?'band1Horz':'band2Horz');
  if(look.vertical&&col>=colStart&&col<cols-(look.lastCol?1:0))keys.push(Math.floor((col-colStart)/table.colBandSize)%2===0?'band1Vert':'band2Vert');
  if(look.firstCol&&col===0)keys.push('firstCol');
  if(look.lastCol&&col===cols-1)keys.push('lastCol');
  if(look.firstRow&&row===0)keys.push('firstRow');
  if(look.lastRow&&row===rows-1)keys.push('lastRow');
  if(look.firstRow&&look.firstCol&&row===0&&col===0)keys.push('nwCell');
  if(look.firstRow&&look.lastCol&&row===0&&col===cols-1)keys.push('neCell');
  if(look.lastRow&&look.firstCol&&row===rows-1&&col===0)keys.push('swCell');
  if(look.lastRow&&look.lastCol&&row===rows-1&&col===cols-1)keys.push('seCell');
  return keys;
}

export function tablePreviewSize(table:Table,look:TableLook){
  const horizontal=look.horizontal&&(table.regions.band1Horz||table.regions.band2Horz);
  const vertical=look.vertical&&(table.regions.band1Vert||table.regions.band2Vert);
  return {rows:Math.max(4,horizontal?table.rowBandSize*2+Number(look.firstRow)+Number(look.lastRow):0),
    cols:Math.max(3,vertical?table.colBandSize*2+Number(look.firstCol)+Number(look.lastCol):0)};
}

export function resolveTableCell(project:Project,style:Style,table:Table,row:number,col:number,rows:number,cols:number,look:TableLook,contentStyle?:Style){
  let {run,paragraph}=resolveStyle(project,style);
  let paragraphShading=styleChain(project,style).reduce<string|undefined>((value,s)=>s.paragraph.shading??value,undefined);
  let shading=table.shading,verticalAlign=table.verticalAlign;
  const borders:CellBorders={top:table.border,bottom:table.border,left:table.border,right:table.border};
  for(const key of tableRegionsAt(table,row,col,rows,cols,look)){
    const region=table.regions[key];if(!region)continue;
    run={...run,...Object.fromEntries(Object.entries(region.run).filter(([,v])=>v!==undefined))};
    paragraph=mergeParagraph(paragraph,region.paragraph);
    paragraphShading=region.paragraph.shading??paragraphShading;
    shading=region.shading??shading;verticalAlign=region.verticalAlign??verticalAlign;
    // 区域外框只落在这组单元格的周边，内部边框落在组内共享边上。
    for(const [side,dr,dc,inside] of [['top',-1,0,'insideH'],['bottom',1,0,'insideH'],['left',0,-1,'insideV'],['right',0,1,'insideV']] as const){
      const internal=tableRegionsAt(table,row+dr,col+dc,rows,cols,look).includes(key);
      const border=region.borders?.[internal?inside:side];if(border)borders[side]=border;
    }
  }
  if(contentStyle){
    // 段落样式只覆盖显式设置和其继承属性，文档默认值不能抹掉表格格式。
    for(const entry of styleChain(project,contentStyle)){
      run={...run,...Object.fromEntries(Object.entries(entry.run).filter(([,v])=>v!==undefined))};
      paragraph=mergeParagraph(paragraph,entry.paragraph);
      paragraphShading=entry.paragraph.shading??paragraphShading;
    }
  }
  return {run,paragraph,paragraphShading,shading,verticalAlign,borders};
}
