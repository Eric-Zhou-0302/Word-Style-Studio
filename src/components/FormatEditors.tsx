import { Plus, Trash2 } from 'lucide-react';
import { baseRun, baseParagraph, borderDefault, fonts, type Run, type Paragraph, type Border, type Borders, type TabStop } from '../model';
import { ColorInput, Field, NumberInput, Select, Section, TextInput, type Option, Note } from './Fields';

type FormatProps<T>={value:T;resolved?:Required<T>;inheritanceSource?:string;onChange:(v:T)=>void};
export function RunEditor({value,resolved=baseRun,inheritanceSource,onChange,compact=false,numberingMode}:{compact?:boolean;numberingMode?:{linkedName?:string}}&FormatProps<Run>){
  const r={...resolved,...value};
  function update<K extends keyof Run>(key:K,v:Run[K]){const next={...value};if(v===undefined)delete next[key];else next[key]=v;onChange(next);}
  const wrap=(key:keyof Run,label:string,child:React.ReactNode,hint?:string,reference?:string)=>{
    if(numberingMode){
      const following=value[key]===undefined;
      const referenceValue=reference??(typeof resolved[key]==='boolean'?(resolved[key]?'开启':'关闭'):String(resolved[key]));
      return <Field key={key} label={label} hint={hint}>
        {following?<div className="numbering-follow-row"><span>{numberingMode.linkedName?`跟随 · ${referenceValue}（参考）`:'随实际段落'}</span><button type="button" className="text-button" aria-label={`${label}单独设置`} onClick={()=>update(key,resolved[key])}>单独设置</button></div>:<div className="numbering-override">{child}<button type="button" className="text-button" aria-label={`${label}恢复跟随`} onClick={()=>update(key,undefined)}>恢复跟随</button></div>}
      </Field>;
    }
    return <Field key={key} label={label} hint={hint} inheritanceSource={inheritanceSource} inherited={value[key]===undefined} onReset={value[key]!==undefined?()=>update(key,undefined):undefined}>{child}</Field>;
  };
  const number=(key:keyof Run,label:string,min:number,max:number,step=1,unit?:string)=>wrap(key,label,<NumberInput label={label} value={r[key] as number} onChange={v=>update(key,v as never)} min={min} max={max} step={step} unit={unit}/>,undefined,`${resolved[key]}${unit?` ${unit}`:''}`);
  const select=(key:keyof Run,label:string,options:readonly Option[])=>wrap(key,label,<Select label={label} value={String(r[key])} onChange={v=>update(key,v as never)} options={options}/>,undefined,options.find(([v])=>v===String(resolved[key]))?.[1]);
  const flag=(key:keyof Run,label:string)=>wrap(key,label,<Select label={label} value={String(r[key])} onChange={v=>update(key,(v==='true') as never)} options={[["true","开启"],["false","关闭"]]}/>);
  return <><datalist id="font-options">{fonts.map(f=><option key={f} value={f}/>)}</datalist><Section title="字体"><div className="field-grid">
    {wrap('font','中文字体',<TextInput label="中文字体" value={r.font} onChange={v=>update('font',v)} list="font-options"/>)}
    {wrap('latinFont','西文字体',<TextInput label="西文字体" value={r.latinFont} onChange={v=>update('latinFont',v)} list="font-options"/>)}
    {number('size','字号',1,1638,0.5,'pt')}{wrap('color','文字颜色',<ColorInput label="文字颜色" value={r.color} onChange={v=>update('color',v)}/>)}
    {flag('bold','加粗')}{flag('italic','斜体')}
    {select('underline','下划线',[['none','无'],['single','单线'],['double','双线'],['dotted','点线'],['dash','虚线'],['wave','波浪线'],['words','仅字词']])}
    {wrap('underlineColor','下划线颜色',<ColorInput label="下划线颜色" value={r.underlineColor} onChange={v=>update('underlineColor',v)}/>)}
    {select('strike','删除线',[['none','无'],['single','单删除线'],['double','双删除线']])}{select('script','上下标',[['baseline','正常'],['superscript','上标'],['subscript','下标']])}
    {wrap('shading','文字底纹',<ColorInput label="文字底纹" value={r.shading} onChange={v=>update('shading',v)}/>)}
  </div></Section>{!compact&&<><Section title="字符间距"><div className="field-grid">{number('scale','缩放',1,600,1,'%')}{number('spacing','字符间距',-20,100,0.1,'pt')}{number('position','位置',-100,100,0.5,'pt')}{number('kerning','开始调整字距的字号',0,1638,0.5,'pt')}</div><Note>字符间距：正值加宽，负值紧缩。位置：正值提升，负值降低。字距调整为 0 时关闭。</Note></Section>
  <Section title="文字效果与校对"><div className="field-grid">{flag('caps','全部大写')}{flag('smallCaps','小型大写字母')}{flag('hidden','隐藏文字')}{flag('noProof','不检查拼写和语法')}{flag('outline','空心')}{flag('shadow','阴影')}{flag('emboss','阳文')}{flag('imprint','阴文')}{select('language','校对语言',[['zh-CN','中文（简体）'],['zh-TW','中文（繁体）'],['en-US','英语（美国）'],['en-GB','英语（英国）'],['ja-JP','日语']])}</div></Section>
  <Section title="OpenType 功能" description="需要所选字体支持；最终效果请在 Word 中检查。"><div className="field-grid">{select('ligatures','连字',[['none','无'],['standard','标准'],['contextual','上下文'],['historical','历史'],['discretional','任意'],['standardContextual','标准和上下文'],['standardHistorical','标准和历史'],['contextualHistorical','上下文和历史'],['standardDiscretional','标准和任意'],['contextualDiscretional','上下文和任意'],['historicalDiscretional','历史和任意'],['standardContextualHistorical','标准、上下文和历史'],['standardContextualDiscretional','标准、上下文和任意'],['standardHistoricalDiscretional','标准、历史和任意'],['contextualHistoricalDiscretional','上下文、历史和任意'],['all','全部']])}{select('numForm','数字形式',[['default','默认'],['lining','等高'],['oldStyle','旧式']])}{select('numSpacing','数字间距',[['default','默认'],['proportional','按比例'],['tabular','等宽']])}{flag('contextualAlternates','上下文替换')}</div></Section></>}</>;
}

export function ParagraphEditor({value,resolved=baseParagraph,inheritanceSource,onChange}:FormatProps<Paragraph>){
  const p={...resolved,...value};
  function update<K extends keyof Paragraph>(key:K,v:Paragraph[K]){const next={...value};if(v===undefined)delete next[key];else next[key]=v;onChange(next);}
  const wrap=(key:keyof Paragraph,label:string,child:React.ReactNode,hint?:string)=><Field key={key} label={label} hint={hint} inheritanceSource={inheritanceSource} inherited={value[key]===undefined} onReset={value[key]!==undefined?()=>update(key,undefined):undefined}>{child}</Field>;
  const number=(key:keyof Paragraph,label:string,min:number,max:number,step=1,unit?:string)=>wrap(key,label,<NumberInput label={label} value={p[key] as number} onChange={v=>update(key,v as never)} min={min} max={max} step={step} unit={unit}/>);
  const select=(key:keyof Paragraph,label:string,options:readonly Option[])=>wrap(key,label,<Select label={label} value={String(p[key])} onChange={v=>update(key,v as never)} options={options}/>);
  const flag=(key:keyof Paragraph,label:string)=>wrap(key,label,<Select label={label} value={String(p[key])} onChange={v=>update(key,(v==='true') as never)} options={[["true","开启"],["false","关闭"]]}/>);
  const unit=p.indentUnit==='char'?'字符':'cm';
  return <><Section title="对齐与缩进"><div className="field-grid">{select('alignment','对齐方式',[['left','左对齐'],['center','居中'],['right','右对齐'],['both','两端对齐'],['distribute','分散对齐']])}{wrap('outlineLevel','大纲级别',<Select label="大纲级别" value={p.outlineLevel} onChange={v=>update('outlineLevel',Number(v))} options={[["9","正文文本"],...Array.from({length:9},(_,i)=>[String(i),`${i+1} 级`] as const)]}/>)}
  {select('indentUnit','缩进单位',[['cm','厘米'],['char','字符']])}{number('firstLine','首行 / 悬挂缩进',-20,55,0.1,unit)}{number('left','左缩进',-20,55,0.1,unit)}{number('right','右缩进',-20,55,0.1,unit)}</div><Note>首行缩进正值向右，负值为悬挂缩进。列表绑定的样式还会采用列表层级的位置设置。</Note></Section>
  <Section title="间距与行距"><div className="field-grid">{select('spacingUnit','段落间距单位',[['pt','磅'],['line','行']])}{select('lineRule','行距方式',[['auto','多倍行距'],['exact','固定值'],['atLeast','最小值']])}{number('before','段前间距',0,1584,0.5,p.spacingUnit==='line'?'行':'pt')}{number('after','段后间距',0,1584,0.5,p.spacingUnit==='line'?'行':'pt')}{number('line','行距值',0.1,1584,0.1,p.lineRule==='auto'?'倍':'pt')}{flag('contextualSpacing','同样式段落间不加间距')}{flag('beforeAuto','自动段前间距')}{flag('afterAuto','自动段后间距')}</div></Section>
  <Section title="换行与分页"><div className="field-grid">{flag('keepNext','与下段同页')}{flag('keepLines','段中不分页')}{flag('pageBreakBefore','段前分页')}{flag('widowControl','孤行控制')}{flag('suppressLineNumbers','取消行号')}{flag('suppressAutoHyphens','不自动断字')}</div></Section>
  <Section title="中文版式与高级设置"><div className="field-grid">{flag('snapToGrid','与文档网格对齐')}{flag('kinsoku','按中文习惯控制首尾字符')}{flag('overflowPunct','允许标点溢出边界')}{flag('wordWrap','允许西文在单词中间换行')}{flag('autoSpaceDE','自动调整中西文间距')}{flag('autoSpaceDN','自动调整中文与数字间距')}{flag('mirrorIndents','镜像缩进')}{flag('bidi','从右向左排版')}{select('textAlignment','文字垂直对齐',[['auto','自动'],['top','顶端'],['center','居中'],['baseline','基线'],['bottom','底端']])}</div></Section></>;
}

export function BorderEditor({value,onChange,label='边框'}:{value:Border;onChange:(v:Border)=>void;label?:string}){
 return <div className="field-grid"><Field label="线型"><Select label={`${label}线型`} value={value.style} onChange={v=>onChange({...value,style:v as Border['style']})} options={[["none","无"],["single","单实线"],["double","双线"],["dotted","点线"],["dashed","虚线"],["thick","粗线"]]}/></Field><Field label="颜色"><ColorInput label={`${label}颜色`} value={value.color} onChange={v=>onChange({...value,color:v})}/></Field><Field label="宽度"><NumberInput label={`${label}宽度`} value={value.width} min={0.25} max={12} step={0.25} unit="pt" onChange={v=>onChange({...value,width:v})}/></Field><Field label="与文字距离"><NumberInput label={`${label}与文字距离`} value={value.space} min={0} max={31} step={1} unit="pt" onChange={v=>onChange({...value,space:v})}/></Field></div>;
}
export function BordersEditor({value,onChange,table=false,inheritanceSource,resolved}:{value:Borders;onChange:(v:Borders)=>void;table?:boolean;inheritanceSource?:string;resolved?:Borders}){
 const sides:([keyof Borders,string])[]=table?[['top','上边框'],['bottom','下边框'],['left','左边框'],['right','右边框'],['insideH','内部横线'],['insideV','内部竖线']]:[['top','上边框'],['bottom','下边框'],['left','左边框'],['right','右边框'],['between','段落之间']];
 return <><div className="border-shortcuts"><button onClick={()=>onChange(Object.fromEntries(sides.map(([k])=>[k,{...borderDefault}])))}>全部边框</button><button onClick={()=>onChange(Object.fromEntries(sides.map(([k])=>[k,{...borderDefault,style:'none'}])))}>全部取消</button><button onClick={()=>onChange({})} title={inheritanceSource?`恢复为${inheritanceSource}`:undefined}>{inheritanceSource==='文档默认值'?'恢复默认':'恢复继承'}</button></div>{sides.map(([key,label])=><details className="border-detail" key={key}><summary>{label}<span title={inheritanceSource?`未设置时使用${inheritanceSource}`:undefined}>{value[key]?value[key]?.style==='none'?'无边框':'已设置':inheritanceSource==='文档默认值'?'文档默认':'继承'}</span></summary><BorderEditor label={label} value={value[key]??resolved?.[key]??{...borderDefault,style:'none'}} onChange={v=>onChange({...value,[key]:v})}/></details>)}</>;
}
export function DecorationEditor({value,resolved,inheritanceSource,onChange}:FormatProps<Paragraph>){
 return <><Section title="段落底纹"><Field label="背景颜色" inheritanceSource={inheritanceSource} inherited={value.shading===undefined} onReset={value.shading!==undefined?()=>{const next={...value};delete next.shading;onChange(next);}:undefined}><ColorInput label="段落背景颜色" value={value.shading??resolved?.shading??'#ffffff'} onChange={v=>onChange({...value,shading:v})}/></Field></Section><Section title="段落边框"><BordersEditor value={value.borders??{}} resolved={resolved?.borders} inheritanceSource={inheritanceSource} onChange={v=>onChange({...value,borders:v})}/></Section><Section title="制表位" description="位置以页面正文区域的左边界为起点。" extra={<button className="icon-button" aria-label="添加制表位" title="添加制表位" onClick={()=>onChange({...value,tabs:[...(value.tabs??resolved?.tabs??[]),{position:1.27,alignment:'left',leader:'none'}]})}><Plus size={16}/></button>}>
 {(value.tabs??resolved?.tabs??[]).length===0&&<div className="empty-small">尚未设置自定义制表位</div>}
 {(value.tabs??resolved?.tabs??[]).map((tab,i)=><div className="tab-stop" key={i}><div className="field-grid"><Field label="位置"><NumberInput label={`制表位 ${i+1} 位置`} value={tab.position} min={0} max={55} step={0.1} unit="cm" onChange={v=>editTab(i,{...tab,position:v})}/></Field><Field label="对齐"><Select label={`制表位 ${i+1} 对齐`} value={tab.alignment} onChange={v=>editTab(i,{...tab,alignment:v as TabStop['alignment']})} options={[["left","左对齐"],["center","居中"],["right","右对齐"],["decimal","小数点"],["bar","竖线"],["clear","清除此位置"]]}/></Field><Field label="前导符"><Select label={`制表位 ${i+1} 前导符`} value={tab.leader} onChange={v=>editTab(i,{...tab,leader:v as TabStop['leader']})} options={[["none","无"],["dot","点线 ……"],["hyphen","短横线 ----"],["underscore","下划线 ____"],["heavy","粗线"],["middleDot","居中点"]]}/></Field><button className="button danger subtle" onClick={()=>onChange({...value,tabs:(value.tabs??resolved?.tabs??[]).filter((_,n)=>n!==i)})}><Trash2 size={14}/>移除</button></div></div>)}
 {value.tabs&&<button className="text-button" onClick={()=>{const next={...value};delete next.tabs;onChange(next);}} title={inheritanceSource?`恢复为${inheritanceSource}`:undefined}>{inheritanceSource==='文档默认值'?'恢复默认制表位':'恢复继承的制表位'}</button>}
 </Section></>;
 function editTab(i:number,tab:TabStop){onChange({...value,tabs:(value.tabs??resolved?.tabs??[]).map((t,n)=>n===i?tab:t)});}
}
