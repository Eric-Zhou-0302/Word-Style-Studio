import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { createProject, validateProject, type Project } from './model';

export const STORAGE_KEY='style-studio.project.v1';
type History={past:Project[];present:Project;future:Project[]};
type Action={type:'change';value:Project}|{type:'undo'}|{type:'redo'};
function reducer(state:History,action:Action):History{
 if(action.type==='undo')return state.past.length?{past:state.past.slice(0,-1),present:state.past.at(-1)!,future:[state.present,...state.future]}:state;
 if(action.type==='redo')return state.future.length?{past:[...state.past,state.present],present:state.future[0],future:state.future.slice(1)}:state;
 if(JSON.stringify(action.value)===JSON.stringify(state.present))return state;
 return {past:[...state.past.slice(-79),state.present],present:action.value,future:[]};
}
export function useProject(active=true){
 const [loadWarning]=useState(()=>{try{const raw=localStorage.getItem(STORAGE_KEY);if(raw)validateProject(JSON.parse(raw));return '';}catch{return '上次保存的方案无法读取。原始数据仍保留在浏览器中，请先下载恢复文件。';}});
 const [state,dispatch]=useReducer(reducer,undefined,()=>{try{const raw=localStorage.getItem(STORAGE_KEY);return {past:[],present:raw?validateProject(JSON.parse(raw)):createProject(),future:[]};}catch{return {past:[],present:createProject(),future:[]};}});
 const [saveError,setSaveError]=useState('');const [saved,setSaved]=useState(false);const [recoveryNeeded,setRecoveryNeeded]=useState(!!loadWarning);
 const validationError=useMemo(()=>{try{validateProject(state.present);return '';}catch(e){return e instanceof Error?e.message:'请检查方案设置';}},[state.present]);
 useEffect(()=>{setSaved(false);if(validationError||recoveryNeeded)return;const timer=setTimeout(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.present));setSaveError('');setSaved(true);}catch{setSaveError('浏览器存储空间不足或不可用。请导出方案 JSON 保存本次修改。');}},400);return()=>clearTimeout(timer);},[state.present,validationError,recoveryNeeded]);
 const update=useCallback((value:Project)=>dispatch({type:'change',value}),[]);const undo=useCallback(()=>dispatch({type:'undo'}),[]);const redo=useCallback(()=>dispatch({type:'redo'}),[]);
 useEffect(()=>{if(!active)return;const fn=(event:KeyboardEvent)=>{
  // hashchange 异步触发，离开工作区后的首个按键也要立即停止处理。
  if(!window.location.hash.startsWith('#workspace')||!(event.metaKey||event.ctrlKey)||event.key.toLowerCase()!=='z')return;
  if(event.target instanceof HTMLElement&&event.target.closest('input,textarea,[contenteditable],dialog'))return;event.preventDefault();event.shiftKey?redo():undo();
 };window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[active,undo,redo]);
 return {project:state.present,update,undo,redo,canUndo:state.past.length>0,canRedo:state.future.length>0,validationError,saveError,saved,loadWarning:recoveryNeeded?loadWarning:'',clearRecovery:()=>setRecoveryNeeded(false)};
}
