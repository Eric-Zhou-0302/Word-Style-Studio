import {createLegacyProject as createProject} from './legacy-fixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { importFile, importWord } from '../src/import';


const archive = (extra: Record<string, Uint8Array> = {}) => zipSync({ 'word/style-studio.json':strToU8(JSON.stringify(createProject())), ...extra });

test('embedded project restores every model property without browser XML APIs', () => {
  const project = createProject();
  project.styles[1].run = {font:'仿宋_GB2312',bold:false,size:13.5,ligatures:'all'};
  project.lists[0].levels[1].restart = 0;
  const result = importWord(zipSync({'word/style-studio.json':strToU8(JSON.stringify(project))}));
  assert.deepEqual(result.project,JSON.parse(JSON.stringify(project)));
  assert.match(result.warnings.join('\n'),/嵌入方案可能/);
});
test('JSON uses the schema and relationship validator', async () => {
  const project = createProject();
  const file = new File([JSON.stringify(project)],'project.json',{type:'application/json'});
  assert.deepEqual((await importFile(file)).project,JSON.parse(JSON.stringify(project)));
  project.styles[1].basedOn=project.styles[1].id;
  await assert.rejects(importFile(new File([JSON.stringify(project)],'bad.json')),/循环/);
});
test('rejects path traversal and duplicate ZIP records before restoring JSON', () => {
  assert.throws(()=>importWord(archive({'../escape.xml':strToU8('x')})),/不安全路径/);
  assert.throws(()=>importWord(archive({'word\\escape.xml':strToU8('x')})),/不安全路径/);
  const bytes=archive({'word/other-file.json':strToU8('x')});
  // 使用相同长度名字，检查中央目录与本地头不一致也会拒绝。
  const original=strToU8('word/other-file.json');
  for(let i=bytes.length-original.length;i>=0;i--)if(original.every((v,j)=>bytes[i+j]===v)){bytes[i]=0x2f;break;}
  assert.throws(()=>importWord(bytes),/不安全路径|不一致/);
});
test('rejects encrypted flags before decompression', () => {
  const bytes=archive();const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  for(let i=0;i<bytes.length-46;i++)if(view.getUint32(i,true)===0x02014b50){view.setUint16(i+8,view.getUint16(i+8,true)|1,true);break;}
  assert.throws(()=>importWord(bytes),/加密/);
});
test('enforces declared expansion size and verifies CRC', () => {
  const bytes=archive();const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  for(let i=0;i<bytes.length-46;i++)if(view.getUint32(i,true)===0x02014b50){view.setUint32(i+24,41*1024*1024,true);break;}
  assert.throws(()=>importWord(bytes),/40 MB/);
  const corrupt=archive();const v=new DataView(corrupt.buffer,corrupt.byteOffset,corrupt.byteLength);
  for(let i=0;i<corrupt.length-46;i++)if(v.getUint32(i,true)===0x02014b50){v.setUint32(i+16,v.getUint32(i+16,true)^1,true);break;}
  assert.throws(()=>importWord(corrupt),/校验失败/);
});
test('DTD is rejected even when the package contains an embedded project', () => {
  assert.throws(()=>importWord(archive({'word/styles.xml':strToU8('<!DOCTYPE x [<!ENTITY bomb "x">]><x/>')})),/DTD/);
});
test('invalid files and oversized inputs fail with useful errors', async () => {
  assert.throws(()=>importWord(new Uint8Array(10*1024*1024+1)),/10 MB/);
  assert.throws(()=>importWord(strToU8('not a zip')),/有效/);
  await assert.rejects(importFile(new File(['hello'],'old.doc')),/请选择/);
  await assert.rejects(importFile(new File(['{'],'bad.json')),/无法解析/);
});
