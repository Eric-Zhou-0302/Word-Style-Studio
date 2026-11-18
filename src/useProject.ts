import { useCallback, useEffect, useMemo, useReducer, useLayoutEffect, useRef, useState } from 'react';
import { createProject, validateProject, type Project } from './model';
import type { Locale } from './i18n';

export const STORAGE_KEY='style-studio.project.v1';
type History={past:Project[];present:Project;future:Project[]};
type Action={type:'change';value:Project}|{type:'undo'}|{type:'redo'}|{type:'load';value:Project};
function reducer(state:History,action:Action):History{
 if(action.type==='load')return {past:[],present:action.value,future:[]};
 if(action.type==='undo')return state.past.length?{past:state.past.slice(0,-1),present:state.past.at(-1)!,future:[state.present,...state.future]}:state;
 if(action.type==='redo')return state.future.length?{past:[...state.past,state.present],present:state.future[0],future:state.future.slice(1)}:state;
 if(JSON.stringify(action.value)===JSON.stringify(state.present))return state;
 return {past:[...state.past.slice(-79),state.present],present:action.value,future:[]};
}
export function useProject(active=true,locale:Locale='zh'){
 const [initial]=useState(()=>{
  const fallback=createProject(locale);
  let raw:string|null=null;
  try{raw=localStorage.getItem(STORAGE_KEY);}catch{return {project:fallback,raw,warning:'',unavailable:true};}
  try{return {project:raw?validateProject(JSON.parse(raw)):fallback,raw,warning:'',unavailable:false};}
  catch{return {project:fallback,raw,warning:'上次保存的方案无法读取。原始数据仍保留在浏览器中，请先下载恢复文件。',unavailable:false};}
 });
 const loadWarning=initial.warning;
 const [state,dispatch]=useReducer(reducer,{past:[],present:initial.project,future:[]});
 const base=useRef(initial.raw), last=useRef<Project|null>(initial.project);
 const prefix=STORAGE_KEY+'.draft.';
 const [draftKey]=useState(()=>prefix+crypto.randomUUID());
 const [other,setOther]=useState<Project|null>(null);
 const [recovered,setRecovered]=useState<{key:string;project:Project}[]>([]);
 useEffect(()=>{
  try{const drafts=Object.keys(localStorage).filter(k=>k.startsWith(prefix)).flatMap(key=>{
   try{return [{key,project:validateProject(JSON.parse(localStorage.getItem(key)!))}];}catch{return [];}
  });setRecovered(drafts);}catch{/* 本次会话仍可编辑 */}
 },[]);
 const [saveError,setSaveError]=useState(initial.unavailable?'浏览器存储空间不足或不可用。请导出方案 JSON 保存本次修改。':'');const [saved,setSaved]=useState(false);const [recoveryNeeded,setRecoveryNeeded]=useState(!!loadWarning);
 const validationError=useMemo(()=>{try{validateProject(state.present);return '';}catch(e){return e instanceof Error?e.message:'请检查方案设置';}},[state.present]);
 useLayoutEffect(()=>{
  if(validationError||recoveryNeeded){setSaved(false);return;}
  if(state.present===last.current){setSaved(!!base.current);return;}
  const value=JSON.stringify(state.present);
  let stale=false;
  setSaved(false);
  const failed=()=>setSaveError('浏览器存储空间不足或不可用。请导出方案 JSON 保存本次修改。');
  try{localStorage.setItem(draftKey,value);}catch{failed();return;}
  const commit=()=>{
   if(stale)return;
   const head=localStorage.getItem(STORAGE_KEY);
   if(head!==base.current && head!==value && head){setOther(validateProject(JSON.parse(head)));return;}
   localStorage.setItem(STORAGE_KEY,value);
   base.current=value;last.current=state.present;localStorage.removeItem(draftKey);setSaved(true);setSaveError('');setOther(null);
  };
  if(navigator.locks)void navigator.locks.request(STORAGE_KEY,commit).catch(failed);
  else try{commit();}catch{failed();}
  return ()=>{stale=true;};
 },[state.present,validationError,recoveryNeeded,draftKey]);
 useEffect(()=>{
  const sync=(event:StorageEvent)=>{
   if(event.key!==STORAGE_KEY||!event.newValue||event.newValue===base.current)return;
   try{const project=validateProject(JSON.parse(event.newValue));
    if(last.current!==state.present){setOther(project);return;}
    base.current=event.newValue;last.current=project;dispatch({type:'load',value:project});
   }catch{/* 保留当前有效方案 */}
  };
  window.addEventListener('storage',sync);return ()=>window.removeEventListener('storage',sync);
 },[state.present]);
 function resolveConflict(keep:boolean){
  try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return;
   const shared=validateProject(JSON.parse(raw));
   const key=prefix+crypto.randomUUID();
   localStorage.setItem(key,keep?raw:JSON.stringify(state.present));
   setRecovered(items=>[...items,{key,project:keep?shared:state.present}]);
   base.current=raw;setOther(null);
   if(keep)dispatch({type:'load',value:structuredClone(state.present)});
   else{last.current=shared;localStorage.removeItem(draftKey);dispatch({type:'load',value:shared});}
  }catch{setSaveError('浏览器存储空间不足或不可用。请导出方案 JSON 保存本次修改。');}
 }
 const update=useCallback((value:Project)=>dispatch({type:'change',value}),[]);const undo=useCallback(()=>dispatch({type:'undo'}),[]);const redo=useCallback(()=>dispatch({type:'redo'}),[]);
 useEffect(()=>{if(!active)return;const fn=(event:KeyboardEvent)=>{
  // hashchange 异步触发，离开工作区后的首个按键也要立即停止处理。
  if(!window.location.hash.startsWith('#workspace')||!(event.metaKey||event.ctrlKey)||event.key.toLowerCase()!=='z')return;
  if(event.target instanceof HTMLElement&&event.target.closest('input,textarea,[contenteditable],dialog'))return;event.preventDefault();event.shiftKey?redo():undo();
 };window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[active,undo,redo]);
 return {pristine:state.present===initial.project&&!base.current,other,resolveConflict,recovered,recoveryRaw:initial.raw,project:state.present,update,undo,redo,canUndo:state.past.length>0,canRedo:state.future.length>0,validationError,saveError,saved,loadWarning:recoveryNeeded?loadWarning:'',clearRecovery:()=>{last.current=null;setRecoveryNeeded(false);}};
}
