import { useI18n } from '../i18n';
import { Plus, Trash2 } from 'lucide-react';
import { baseRun, baseParagraph, borderDefault, fonts, type Run, type Paragraph, type Border, type Borders, type TabStop } from '../model';
import { ColorInput, Field, NumberInput, Select, Section, TextInput, type Option, Note } from './Fields';

type FormatProps<T>={value:T;resolved?:Required<T>;inheritanceSource?:string;onChange:(v:T)=>void};
export function RunEditor({value,resolved=baseRun,inheritanceSource,onChange,compact=false,numberingMode}:{compact?:boolean;numberingMode?:{linkedName?:string}}&FormatProps<Run>){
 const {ui,fmt,t}=useI18n();
  const r={...resolved,...value};
  function update<K extends keyof Run>(key:K,v:Run[K]){const next={...value};if(v===undefined)delete next[key];else next[key]=v;onChange(next);}
  const wrap=(key:keyof Run,label:string,child:React.ReactNode,hint?:string,reference?:string)=>{
    if(numberingMode){
      const following=value[key]===undefined;
      const referenceValue=reference??(typeof resolved[key]==='boolean'?(resolved[key]?ui("开启"):ui("关闭")):String(resolved[key]));
      return <Field key={key} label={label} hint={hint}>
        {following?<div className="numbering-follow-row"><span>{numberingMode.linkedName?fmt("跟随 · {0}（参考）",referenceValue):ui("随实际段落")}</span><button type="button" className="text-button" aria-label={fmt("{0}单独设置",label)} onClick={()=>update(key,resolved[key])}>{ui("单独设置")}</button></div>:<div className="numbering-override">{child}<button type="button" className="text-button" aria-label={fmt("{0}恢复跟随",label)} onClick={()=>update(key,undefined)}>{ui("恢复跟随")}</button></div>}
      </Field>;
    }
    return <Field key={key} label={label} hint={hint} inheritanceSource={inheritanceSource} inherited={value[key]===undefined} onReset={value[key]!==undefined?()=>update(key,undefined):undefined}>{child}</Field>;
  };
  const number=(key:keyof Run,label:string,min:number,max:number,step=1,unit?:string)=>wrap(key,label,<NumberInput label={label} value={r[key] as number} onChange={v=>update(key,v as never)} min={min} max={max} step={step} unit={unit}/>,undefined,`${resolved[key]}${unit?` ${unit}`:''}`);
  const select=(key:keyof Run,label:string,options:readonly Option[])=>wrap(key,label,<Select label={label} value={String(r[key])} onChange={v=>update(key,v as never)} options={options}/>,undefined,options.find(([v])=>v===String(resolved[key]))?.[1]);
  const flag=(key:keyof Run,label:string)=>wrap(key,label,<Select label={label} value={String(r[key])} onChange={v=>update(key,(v==='true') as never)} options={[["true",ui("开启")],["false",ui("关闭")]]}/>);
  return <><datalist id="font-options">{fonts.map(f=><option key={f} value={f}/>)}</datalist><Section title={ui("字体")}><div className="field-grid">
    {wrap('font',ui("中文字体"),<TextInput label={ui("中文字体")} value={r.font} onChange={v=>update('font',v)} list="font-options"/>)}
    {wrap('latinFont',ui("西文字体"),<TextInput label={ui("西文字体")} value={r.latinFont} onChange={v=>update('latinFont',v)} list="font-options"/>)}
    {number('size',ui("字号"),1,1638,0.5,'pt')}{wrap('color',ui("文字颜色"),<ColorInput label={ui("文字颜色")} value={r.color} onChange={v=>update('color',v)}/>)}
    {flag('bold',ui("加粗"))}{flag('italic',ui("斜体"))}
    {select('underline',ui("下划线"),[['none',ui("无")],['single',ui("单线")],['double',ui("双线")],['dotted',ui("点线")],['dash',ui("虚线")],['wave',ui("波浪线")],['words',ui("仅字词")]])}
    {wrap('underlineColor',ui("下划线颜色"),<ColorInput label={ui("下划线颜色")} value={r.underlineColor} onChange={v=>update('underlineColor',v)}/>)}
    {select('strike',ui("删除线"),[['none',ui("无")],['single',ui("单删除线")],['double',ui("双删除线")]])}{select('script',ui("上下标"),[['baseline',ui("正常")],['superscript',ui("上标")],['subscript',ui("下标")]])}
    {wrap('shading',ui("文字底纹"),<ColorInput label={ui("文字底纹")} value={r.shading} onChange={v=>update('shading',v)}/>)}
  </div></Section>{!compact&&<><Section title={ui("字符间距")}><div className="field-grid">{number('scale',ui("缩放"),1,600,1,'%')}{number('spacing',ui("字符间距"),-20,100,0.1,'pt')}{number('position',ui("位置"),-100,100,0.5,'pt')}{number('kerning',ui("开始调整字距的字号"),0,1638,0.5,'pt')}</div><Note>{ui("字符间距：正值加宽，负值紧缩。位置：正值提升，负值降低。字距调整为 0 时关闭。")}</Note></Section>
  <Section title={ui("文字效果与校对")}><div className="field-grid">{flag('caps',ui("全部大写"))}{flag('smallCaps',ui("小型大写字母"))}{flag('hidden',ui("隐藏文字"))}{flag('noProof',ui("不检查拼写和语法"))}{flag('outline',ui("空心"))}{flag('shadow',ui("阴影"))}{flag('emboss',ui("阳文"))}{flag('imprint',ui("阴文"))}{select('language',ui("校对语言"),[['zh-CN',ui("中文（简体）")],['zh-TW',ui("中文（繁体）")],['en-US',ui("英语（美国）")],['en-GB',ui("英语（英国）")],['ja-JP',ui("日语")]])}</div></Section>
  <Section title={ui("OpenType 功能")} description={ui("需要所选字体支持；最终效果请在 Word 中检查。")}><div className="field-grid">{select('ligatures',ui("连字"),[['none',ui("无")],['standard',ui("标准")],['contextual',ui("上下文")],['historical',ui("历史")],['discretional',ui("任意")],['standardContextual',ui("标准和上下文")],['standardHistorical',ui("标准和历史")],['contextualHistorical',ui("上下文和历史")],['standardDiscretional',ui("标准和任意")],['contextualDiscretional',ui("上下文和任意")],['historicalDiscretional',ui("历史和任意")],['standardContextualHistorical',ui("标准、上下文和历史")],['standardContextualDiscretional',ui("标准、上下文和任意")],['standardHistoricalDiscretional',ui("标准、历史和任意")],['contextualHistoricalDiscretional',ui("上下文、历史和任意")],['all',ui("全部")]])}{select('numForm',ui("数字形式"),[['default',ui("默认")],['lining',ui("等高")],['oldStyle',ui("旧式")]])}{select('numSpacing',ui("数字间距"),[['default',ui("默认")],['proportional',ui("按比例")],['tabular',ui("等宽")]])}{flag('contextualAlternates',ui("上下文替换"))}</div></Section></>}</>;
}

export function ParagraphEditor({value,resolved=baseParagraph,inheritanceSource,onChange}:FormatProps<Paragraph>){
 const {ui,fmt,t}=useI18n();
  const p={...resolved,...value};
  function update<K extends keyof Paragraph>(key:K,v:Paragraph[K]){const next={...value};if(v===undefined)delete next[key];else next[key]=v;onChange(next);}
  const wrap=(key:keyof Paragraph,label:string,child:React.ReactNode,hint?:string)=><Field key={key} label={label} hint={hint} inheritanceSource={inheritanceSource} inherited={value[key]===undefined} onReset={value[key]!==undefined?()=>update(key,undefined):undefined}>{child}</Field>;
  const number=(key:keyof Paragraph,label:string,min:number,max:number,step=1,unit?:string)=>wrap(key,label,<NumberInput label={label} value={p[key] as number} onChange={v=>update(key,v as never)} min={min} max={max} step={step} unit={unit}/>);
  const select=(key:keyof Paragraph,label:string,options:readonly Option[])=>wrap(key,label,<Select label={label} value={String(p[key])} onChange={v=>update(key,v as never)} options={options}/>);
  const flag=(key:keyof Paragraph,label:string)=>wrap(key,label,<Select label={label} value={String(p[key])} onChange={v=>update(key,(v==='true') as never)} options={[["true",ui("开启")],["false",ui("关闭")]]}/>);
  const unit=p.indentUnit==='char'?t('字符','characters'):'cm';
  return <><Section title={ui("对齐与缩进")}><div className="field-grid">{select('alignment',ui("对齐方式"),[['left',ui("左对齐")],['center',ui("居中")],['right',ui("右对齐")],['both',ui("两端对齐")],['distribute',ui("分散对齐")]])}{wrap('outlineLevel',ui("大纲级别"),<Select label={ui("大纲级别")} value={p.outlineLevel} onChange={v=>update('outlineLevel',Number(v))} options={[["9",ui("正文文本")],...Array.from({length:9},(_,i)=>[String(i),fmt("{0} 级",i+1)] as const)]}/>)}
  {select('indentUnit',ui("缩进单位"),[['cm',ui("厘米")],['char',ui("字符")]])}{number('firstLine',ui("首行 / 悬挂缩进"),-20,55,0.1,unit)}{number('left',ui("左缩进"),-20,55,0.1,unit)}{number('right',ui("右缩进"),-20,55,0.1,unit)}</div><Note>{ui("首行缩进正值向右，负值为悬挂缩进。列表绑定的样式还会采用列表层级的位置设置。")}</Note></Section>
  <Section title={ui("间距与行距")}><div className="field-grid">{select('spacingUnit',ui("段落间距单位"),[['pt',ui("磅")],['line',ui("行")]])}{select('lineRule',ui("行距方式"),[['auto',ui("多倍行距")],['exact',ui("固定值")],['atLeast',ui("最小值")]])}{number('before',ui("段前间距"),0,1584,0.5,p.spacingUnit==='line'?ui("行"):'pt')}{number('after',ui("段后间距"),0,1584,0.5,p.spacingUnit==='line'?ui("行"):'pt')}{number('line',ui("行距值"),0.1,1584,0.1,p.lineRule==='auto'?ui("倍"):'pt')}{flag('contextualSpacing',ui("同样式段落间不加间距"))}{flag('beforeAuto',ui("自动段前间距"))}{flag('afterAuto',ui("自动段后间距"))}</div></Section>
  <Section title={ui("换行与分页")}><div className="field-grid">{flag('keepNext',ui("与下段同页"))}{flag('keepLines',ui("段中不分页"))}{flag('pageBreakBefore',ui("段前分页"))}{flag('widowControl',ui("孤行控制"))}{flag('suppressLineNumbers',ui("取消行号"))}{flag('suppressAutoHyphens',ui("不自动断字"))}</div></Section>
  <Section title={ui("中文版式与高级设置")}><div className="field-grid">{flag('snapToGrid',ui("与文档网格对齐"))}{flag('kinsoku',ui("按中文习惯控制首尾字符"))}{flag('overflowPunct',ui("允许标点溢出边界"))}{flag('wordWrap',ui("允许西文在单词中间换行"))}{flag('autoSpaceDE',ui("自动调整中西文间距"))}{flag('autoSpaceDN',ui("自动调整中文与数字间距"))}{flag('mirrorIndents',ui("镜像缩进"))}{flag('bidi',ui("从右向左排版"))}{select('textAlignment',ui("文字垂直对齐"),[['auto',ui("自动")],['top',ui("顶端")],['center',ui("居中")],['baseline',ui("基线")],['bottom',ui("底端")]])}</div></Section></>;
}

export function BorderEditor({value,onChange,label:providedLabel}:{value:Border;onChange:(v:Border)=>void;label?:string}){
 const {ui,fmt,t}=useI18n();
 const label=providedLabel??ui("边框");
 return <div className="field-grid"><Field label={ui("线型")}><Select label={fmt("{0}线型",label)} value={value.style} onChange={v=>onChange({...value,style:v as Border['style']})} options={[["none",ui("无")],["single",ui("单实线")],["double",ui("双线")],["dotted",ui("点线")],["dashed",ui("虚线")],["thick",ui("粗线")]]}/></Field><Field label={ui("颜色")}><ColorInput label={fmt("{0}颜色",label)} value={value.color} onChange={v=>onChange({...value,color:v})}/></Field><Field label={ui("宽度")}><NumberInput label={fmt("{0}宽度",label)} value={value.width} min={0.25} max={12} step={0.25} unit="pt" onChange={v=>onChange({...value,width:v})}/></Field><Field label={ui("与文字距离")}><NumberInput label={fmt("{0}与文字距离",label)} value={value.space} min={0} max={31} step={1} unit="pt" onChange={v=>onChange({...value,space:v})}/></Field></div>;
}
export function BordersEditor({value,onChange,table=false,inheritanceSource,resolved}:{value:Borders;onChange:(v:Borders)=>void;table?:boolean;inheritanceSource?:string;resolved?:Borders}){
 const {ui,fmt,t}=useI18n();
 const sides:([keyof Borders,string])[]=table?[['top',ui("上边框")],['bottom',ui("下边框")],['left',ui("左边框")],['right',ui("右边框")],['insideH',ui("内部横线")],['insideV',ui("内部竖线")]]:[['top',ui("上边框")],['bottom',ui("下边框")],['left',ui("左边框")],['right',ui("右边框")],['between',ui("段落之间")]];
 return <><div className="border-shortcuts"><button onClick={()=>onChange(Object.fromEntries(sides.map(([k])=>[k,{...borderDefault}])))}>{ui("全部边框")}</button><button onClick={()=>onChange(Object.fromEntries(sides.map(([k])=>[k,{...borderDefault,style:'none'}])))}>{ui("全部取消")}</button><button onClick={()=>onChange({})} title={inheritanceSource?fmt("恢复为{0}",inheritanceSource):undefined}>{inheritanceSource===ui("文档默认值")?ui("恢复默认"):ui("恢复继承")}</button></div>{sides.map(([key,label])=><details className="border-detail" key={key}><summary>{label}<span title={inheritanceSource?fmt("未设置时使用{0}",inheritanceSource):undefined}>{value[key]?value[key]?.style==='none'?ui("无边框"):ui("已设置"):inheritanceSource===ui("文档默认值")?ui("文档默认"):ui("继承")}</span></summary><BorderEditor label={label} value={value[key]??resolved?.[key]??{...borderDefault,style:'none'}} onChange={v=>onChange({...value,[key]:v})}/></details>)}</>;
}
export function DecorationEditor({value,resolved,inheritanceSource,onChange}:FormatProps<Paragraph>){
 const {ui,fmt,t}=useI18n();
 return <><Section title={ui("段落底纹")}><Field label={ui("背景颜色")} inheritanceSource={inheritanceSource} inherited={value.shading===undefined} onReset={value.shading!==undefined?()=>{const next={...value};delete next.shading;onChange(next);}:undefined}><ColorInput label={ui("段落背景颜色")} value={value.shading??resolved?.shading??'#ffffff'} onChange={v=>onChange({...value,shading:v})}/></Field></Section><Section title={ui("段落边框")}><BordersEditor value={value.borders??{}} resolved={resolved?.borders} inheritanceSource={inheritanceSource} onChange={v=>onChange({...value,borders:v})}/></Section><Section title={ui("制表位")} description={ui("位置以页面正文区域的左边界为起点。")} extra={<button className="icon-button" aria-label={ui("添加制表位")} title={ui("添加制表位")} onClick={()=>onChange({...value,tabs:[...(value.tabs??resolved?.tabs??[]),{position:1.27,alignment:'left',leader:'none'}]})}><Plus size={16}/></button>}>
 {(value.tabs??resolved?.tabs??[]).length===0&&<div className="empty-small">{ui("尚未设置自定义制表位")}</div>}
 {(value.tabs??resolved?.tabs??[]).map((tab,i)=><div className="tab-stop" key={i}><div className="field-grid"><Field label={ui("位置")}><NumberInput label={fmt("制表位 {0} 位置",i+1)} value={tab.position} min={0} max={55} step={0.1} unit="cm" onChange={v=>editTab(i,{...tab,position:v})}/></Field><Field label={ui("对齐")}><Select label={fmt("制表位 {0} 对齐",i+1)} value={tab.alignment} onChange={v=>editTab(i,{...tab,alignment:v as TabStop['alignment']})} options={[["left",ui("左对齐")],["center",ui("居中")],["right",ui("右对齐")],["decimal",ui("小数点")],["bar",ui("竖线")],["clear",ui("清除此位置")]]}/></Field><Field label={ui("前导符")}><Select label={fmt("制表位 {0} 前导符",i+1)} value={tab.leader} onChange={v=>editTab(i,{...tab,leader:v as TabStop['leader']})} options={[["none",ui("无")],["dot",ui("点线 ……")],["hyphen",ui("短横线 ----")],["underscore",ui("下划线 ____")],["heavy",ui("粗线")],["middleDot",ui("居中点")]]}/></Field><button className="button danger subtle" onClick={()=>onChange({...value,tabs:(value.tabs??resolved?.tabs??[]).filter((_,n)=>n!==i)})}><Trash2 size={14}/>{ui("移除")}</button></div></div>)}
 {value.tabs&&<button className="text-button" onClick={()=>{const next={...value};delete next.tabs;onChange(next);}} title={inheritanceSource?fmt("恢复为{0}",inheritanceSource):undefined}>{inheritanceSource===ui("文档默认值")?ui("恢复默认制表位"):ui("恢复继承的制表位")}</button>}
 </Section></>;
 function editTab(i:number,tab:TabStop){onChange({...value,tabs:(value.tabs??resolved?.tabs??[]).map((t,n)=>n===i?tab:t)});}
}
