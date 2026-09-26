import { useI18n } from '../i18n';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { RotateCcw, ChevronDown } from 'lucide-react';

export function Field({label,children,hint,onReset,inherited=false,inheritanceSource,className=''}:{label:string;children:ReactNode;hint?:string;onReset?:()=>void;inherited?:boolean;inheritanceSource?:string;className?:string}) {
 const {ui,fmt}=useI18n();
  const documentDefault=inheritanceSource===ui("文档默认值");
  const resetLabel=fmt("重置{0}为{1}",label,documentDefault?ui("文档默认值"):fmt("继承值{0}",inheritanceSource?`（${inheritanceSource}）`:''));
  return <div className={`field ${className}`}><div className="field-heading"><span>{label}</span>{onReset?<button className="reset-field" type="button" title={resetLabel} aria-label={resetLabel} onClick={onReset}><RotateCcw size={12}/></button>:inherited?<span className="inherit-label" title={documentDefault?ui("使用文档默认值"):inheritanceSource?fmt("继承自{0}",inheritanceSource):undefined}>{documentDefault?ui("文档默认"):ui("继承")}</span>:null}</div>{children}{hint&&<span className="field-hint">{hint}</span>}</div>;
}
export function TextInput({label,value,onChange,placeholder,list,maxLength=255}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;list?:string;maxLength?:number}) {
  return <input aria-label={label} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} list={list} maxLength={maxLength}/>;
}
export function NumberInput({label,value,onChange,min=-100,max=2000,step=1,unit}:{label:string;value:number;onChange:(v:number)=>void;min?:number;max?:number;step?:number;unit?:string}){
  const [draft,setDraft]=useState(String(value));useEffect(()=>setDraft(String(value)),[value]);
  return <div className="number-input"><input aria-label={label} type="number" min={min} max={max} step={step} value={draft} onChange={e=>{setDraft(e.target.value);const n=Number(e.target.value);if(e.target.value!==''&&Number.isFinite(n)&&n>=min&&n<=max)onChange(n);}} onBlur={()=>{const n=Number(draft);const next=draft===''||!Number.isFinite(n)?value:Math.min(max,Math.max(min,n));setDraft(String(next));if(next!==value)onChange(next);}}/>{unit&&<span>{unit}</span>}</div>;
}
export type Option = readonly [string,string];
export function Select({label,value,onChange,options,disabled=false}:{label:string;value:string|number;onChange:(v:string)=>void;options:readonly Option[];disabled?:boolean}){
  return <div className="select-wrap"><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}>{options.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><ChevronDown size={14}/></div>;
}
export function ColorInput({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
 const {ui,fmt}=useI18n();
  const [draft,setDraft]=useState(value);useEffect(()=>setDraft(value),[value]);
  const [open,setOpen]=useState(false);const root=useRef<HTMLDivElement>(null);const picker=useRef<HTMLInputElement>(null);const trigger=useRef<HTMLButtonElement>(null);const paletteId=useId();
  useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
  const commonColors=[[ui("黑色"),'#000000'],[ui("深灰"),'#595959'],[ui("灰色"),'#A6A6A6'],[ui("浅灰"),'#D9D9D9'],[ui("白色"),'#FFFFFF'],[ui("红色"),'#C00000'],[ui("橙色"),'#ED7D31'],[ui("黄色"),'#FFC000'],[ui("绿色"),'#548235'],[ui("青色"),'#008C95'],[ui("蓝色"),'#0070C0'],[ui("深蓝"),'#203864'],[ui("紫色"),'#7030A0']] as const;
  function choose(color:string){setDraft(color);onChange(color);setOpen(false);trigger.current?.focus();}
  return <div className="color-picker" ref={root} onKeyDown={e=>{if(e.key==='Escape'&&open){e.stopPropagation();setOpen(false);trigger.current?.focus();}}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}><div className="color-input"><button ref={trigger} type="button" className="color-menu-trigger" aria-label={fmt("{0}选择颜色",label)} aria-expanded={open} aria-controls={paletteId} onClick={()=>setOpen(v=>!v)}><span style={{backgroundColor:value}}/><ChevronDown size={12}/></button><input aria-label={label} value={draft} maxLength={7} onChange={e=>{setDraft(e.target.value);if(/^#[0-9a-f]{6}$/i.test(e.target.value))onChange(e.target.value);}} onBlur={()=>setDraft(value)}/></div><input ref={picker} className="native-color-picker" type="color" aria-label={fmt("{0}更多颜色色板",label)} tabIndex={-1} value={value} onChange={e=>{setDraft(e.target.value);onChange(e.target.value);}}/>{open&&<div className="color-popover" id={paletteId} role="group" aria-label={fmt("{0}常用颜色",label)}><strong>{ui("常用颜色")}</strong><div className="common-colors">{commonColors.map(([name,color])=><button key={color} type="button" className="color-swatch" style={{backgroundColor:color}} title={`${name} ${color}`} aria-label={`${label}：${name} ${color}`} aria-pressed={value.toUpperCase()===color} onClick={()=>choose(color)}/>)}</div><button type="button" className="more-colors" onClick={()=>{setOpen(false);trigger.current?.focus();picker.current?.click();}}>{ui("更多颜色…")}</button></div>}</div>;
}

export function Toggle({label,checked,onChange,hint,disabled=false}:{label:string;checked:boolean;onChange:(v:boolean)=>void;hint?:string;disabled?:boolean}){
  const id=useId();return <div className="toggle-row"><label htmlFor={id}><span>{label}</span>{hint&&<small>{hint}</small>}</label><button id={id} className="switch" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={()=>onChange(!checked)}><span/></button></div>;
}
export function Section({title,description,children,extra}:{title:string;description?:string;children:ReactNode;extra?:ReactNode}){
  return <section className="form-section"><div className="section-heading"><h3>{title}</h3>{extra}</div>{description&&<p className="section-description">{description}</p>}{children}</section>;
}
export function Note({children}:{children:ReactNode}){return <p className="note">{children}</p>;}
