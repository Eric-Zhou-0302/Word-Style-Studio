import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ArrowUpRight } from 'lucide-react';
import './guide.css';
import { LanguageSwitcher, useI18n } from './i18n';
import { Section, Table } from './GuideParts';
import GuideEnglish from './GuideEnglish';

const chapters = [
 ['start','快速上手','Get started'],['concepts','先理解几个概念','Understand the essentials'],['workspace','认识工作区与方案','Workspace and projects'],['styles','建立与管理样式','Create and manage styles'],
 ['format','字体、段落与边框','Fonts, paragraphs, and borders'],['tables','表格样式','Table styles'],['lists','项目符号与编号','Bullets and numbered lists'],['multilevel','多级列表与样式关联','Multilevel lists and style links'],
 ['preview','页面设置与实时预览','Page settings and live preview'],['import','导入已有文件','Import existing files'],['export','导出与在 Word 中使用','Export and use files in Word'],
 ['example','实战：建立报告模板','Build a report template'],['faq','常见问题与功能边界','Questions and limitations'],
] as const;
export default function Guide({hash}:{hash:string}){
 const { locale, t } = useI18n();
 const previousLocale = useRef(locale);
 const [activeChapter,setActiveChapter]=useState('');
 useEffect(()=>{
  const sections=chapters.map(([id])=>document.getElementById('guide-'+id)).filter((node):node is HTMLElement=>!!node);
  let frame=0;
  const update=()=>{
   frame=0;
   // 高亮依据阅读位置，独立于导航 hash，避免滚动触发锚点跳转。
   const threshold=(parseFloat(getComputedStyle(sections[0]).scrollMarginTop)||110)+1;
   let current='';
   for(const section of sections){if(section.getBoundingClientRect().top<=threshold)current=section.id;else break;}
   if(window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-2)current=sections.at(-1)?.id??current;
   setActiveChapter(current);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  schedule();
  return()=>{window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);cancelAnimationFrame(frame);};
 },[locale]);

 useEffect(()=>{const target=document.getElementById(hash.slice(1));if(target){target.scrollIntoView({block:'start'});target.focus({preventScroll:true});}else window.scrollTo(0,0);},[hash]);
 useEffect(()=>{
  if(previousLocale.current===locale)return;
  previousLocale.current=locale;
  // 翻译改变章节高度，切换后保持当前阅读章节，而不是跳回旧 hash。
  if(activeChapter)document.getElementById(activeChapter)?.scrollIntoView({block:'start'});
 },[locale,activeChapter]);
 return <div className="guide-page" lang={locale==='en'?'en':'zh-CN'}>
 <header className="guide-header"><a className="guide-brand" href="#"><img className="brand-mark" src="/favicon.svg?v=2" alt="" width="42" height="42"/><strong>{t('字序','Word Style Studio')} <small>{t('使用文档','User guide')}</small></strong></a><div className="guide-header-actions"><LanguageSwitcher/><a className="button secondary" href="#workspace"><ArrowLeft size={16}/>{t('返回工作区','Back to workspace')}</a></div></header>
 <div className="guide-layout"><aside className="guide-nav"><div className="guide-nav-title"><BookOpen size={16}/>{t('使用指南','User guide')}</div><nav aria-label={t('使用文档目录','User guide contents')}>{chapters.map(([id,zh,en],i)=><a key={id} href={'#guide-'+id} aria-current={activeChapter==='guide-'+id?'location':undefined}><span>{String(i+1).padStart(2,'0')}</span>{t(zh,en)}</a>)}</nav><p>{t('从一套格式规则，','From a set of formatting rules')}<br/>{t('到下一份 Word 文档。','to your next Word document.')}</p></aside>
 <main className="guide-content"><div className="guide-hero"><span className="eyebrow">{t('字序 · WORD 样式工作室','WORD STYLE STUDIO · USER GUIDE')}</span><h1>{t('把格式设好，','Set your styles.')}<br/>{t('让写作更专注。','Focus on your writing.')}</h1><p>{t('这里管理的是 Word 文档的样式、列表和页面规则。先在网页中定义格式，再导出带有这些规则的空白文档或模板，正文写作在 Word 中完成。','Create Word styles, lists, and page settings in your browser. Export a blank document or template with those rules built in, then write your content in Word.')}</p><div className="guide-hero-links"><a href="#guide-start">{t('第一次使用，从这里开始','New here? Start with the basics')} <ArrowUpRight size={16}/></a><a href="#guide-example">{t('跟着建立一份报告模板 →','Build a report template, step by step →')}</a></div></div>
 {locale==='en'?<GuideEnglish/>:<>
 <Section id="start" title="01 · 快速上手">
 <ol><li><strong>进入工作区，选择起点。</strong>首页可继续编辑已有方案，或从示例、空白开始。示例方案中选择“报告正文”调整字体和段落，各专用样式相互独立；空白方案从“正文”（Normal）开始。</li>
 <li><strong>再调标题。</strong>选择“一级标题”“二级标题”等，分别设置字号、段前段后间距和分页规则。也可以点击左侧“新建样式”。</li>
 <li><strong>设置需要的列表。</strong>标题分章用“多级列表”，普通步骤用“编号列表”，无先后顺序的条目用“项目符号”。默认“标题层级”的前六层已经关联相应标题样式，正文另有两级编号和独立项目符号。</li>
 <li><strong>看预览并导出示例。</strong>右侧可切换整体效果、当前样式或列表、编号测试。首次使用建议在“导出 Word”中开启“包含样式示例”，打开文件检查实际效果。</li>
 <li><strong>导出正式文件。</strong>检查完成后关闭“包含样式示例”，选择 DOCX 或 DOTX，获得带样式和列表定义的空白文件。</li></ol>
 <p className="guide-callout">想从零开始？点击顶部方案名称，在方案管理中选择“从空白新建”。如果只想删除当前样式和列表、保留正文格式及页面设置，可用左侧栏顶部的“清空样式与列表”。</p>
 <p>页面顶部可切换简体中文与 English，首页、工作区与使用文档共用语言选择，当前浏览器会记住设置。切换语言不会翻译或改动方案名称、样式名称、列表名称及其他方案内容；内置示例仍保留原有中文报告格式。</p>
 </Section>
 <Section id="concepts" title="02 · 先理解几个概念">
 <h3>样式：给一组格式起一个名字</h3><p>例如“报告正文”代表宋体、12 pt、1.5 倍行距；“一级标题”代表黑体、20 pt、段前留白。使用样式后，同类内容可以统一调整，不必逐段改字体。单独给选中文字加粗、改颜色属于“直接格式”，它可能覆盖样式效果。有关 Word 自身的操作，见<a href="https://support.microsoft.com/en-us/word/customize-or-create-new-styles" target="_blank" rel="noreferrer">微软的样式说明</a>。</p>
 <Table heads={['类型','作用范围','适合什么']} rows={[
 ['段落样式','整个段落，包括字体和段落设置','正文、引用、图表题、列表正文'],
 ['字符样式','选中的文字，主要控制字体格式','强调、术语、特殊文字'],
 ['链接样式','兼具段落与字符用途；在 Word 中取决于选择范围','既可用于标题整段，也可用于局部文字的格式'],
 ['表格样式','表格整体和指定区域','统一表头、条带行、边框和底纹'],
 ]}/>
 <h3>继承、后续段落与快速样式</h3><p><strong>基于样式</strong>是格式的来源：标题基于正文时，未单独设置的属性沿用正文。单独指定字号后，正文的字号变化不再影响该标题；点击字段旁的重置按钮可恢复继承；没有基础样式时，字段显示“文档默认”，开关选项只显示有效值“开启/关闭”，重置后恢复文档默认值。有基础样式时显示“继承”，悬停提示具体来源。<strong>后续段落样式</strong>则决定在 Word 中按回车产生下一段时用什么格式，例如默认报告标题层级之后切回“报告正文”。</p><p><strong>快速样式</strong>是便于访问的样式集合。“加入快速样式”控制导出标记，不是创建另一份样式。Word 中的显示和排序还取决于客户端设置。见<a href="https://support.microsoft.com/en-us/word/add-and-remove-styles-from-the-quick-styles-gallery" target="_blank" rel="noreferrer">微软的快速样式说明</a>。</p>
 <h3>列表层级不等于大纲级别</h3><p>列表决定段落前的符号或动态编号；大纲级别表达文档结构，常用于导航和目录。标题看起来很大，不代表它自动有大纲级别；设置了“第一级编号”，也不等于设置了“一级大纲”。需要结构化标题时，两边都应配置。本站不生成目录正文。</p>
 <p className="guide-callout">建议把“文字长什么样”交给样式，把“前面的序号怎么递增”交给列表，再把两者关联起来。不要把“1.1”写进标题名称或正文，来替代动态编号。</p>
 </Section>
 <Section id="workspace" title="03 · 认识工作区与方案">
 <Table heads={['区域','可以做什么']} rows={[
 ['顶部','点击方案名称管理方案；撤销、重做；导入文件；导出 Word'],
 ['左侧目录','按名称查找、选择和新建样式或列表；顶部清空、收起目录；底部进入页面设置和使用说明'],
 ['中间编辑区','编辑选中对象；右上角复制或删除；样式设置按选项卡分类'],
 ['右侧实时预览','查看格式和编号效果；右上角收起预览，收起后点击侧边栏展开'],
 ['窄屏界面','通过“样式目录 / 设置 / 预览”切换功能区'],
 ]}/>
 <h3>默认报告方案</h3><p>首次进入工作区或选择“从示例新建”会载入 29 个独立的报告专用样式，不包含正文（Normal），各样式均不基于其他样式。包含封面标题、目录条目、六级标题、报告正文、图表题、来源、脚注和表格内容样式；“标准表格”不基于其他表格样式，独立管理边框、内边距等，单元格文字另用表格表头、表体、表尾段落样式。</p><p>默认 A4 纵向，上下页边距 2.75 cm、左右 2.5 cm，页眉和页脚距边界均为 1.5 cm。西文与数字继承 Times New Roman；中文按样式使用宋体、黑体或楷体。报告正文首行缩进 2 字符；标题后续段落自动转为报告正文。目录条目设有右对齐点状前导制表位（16 cm），但不会自动创建目录域；“脚注”样式也不替代插入脚注功能。</p><p>已保存方案会优先恢复，不会被新默认值自动覆盖。要加载这套报告方案，请先备份当前方案，再从顶部方案管理选择“从示例新建”。</p><h3>保存、备份与撤销</h3><p>修改会在校验通过后自动保存到当前浏览器。顶部“已保存到本机”表示浏览器保存成功，不代表已下载 Word 文件。遇到“待完善”或保存失败，请先处理提示。不同浏览器、设备和访问地址不会自动共享方案；无痕浏览或清理站点数据也可能导致保存消失。</p><p>点击底部“备份方案”，或顶部方案名称 →“导出方案备份”，下载 JSON。JSON 保存可编辑配置，适合迁移和恢复；不要只依赖浏览器存储。顶部箭头支持撤销/重做；未聚焦输入框时也可用 ⌘Z / Ctrl+Z 和加 Shift 的重做快捷键。撤销历史仅在本次页面会话中保留，刷新后不能再依靠它恢复旧方案。</p>
 <Table heads={['操作','结果']} rows={[
 ['从示例新建（顶部方案管理）','替换为报告示例方案；载入 29 个样式、3 套列表和示例页面设置'],
 ['从空白新建（顶部方案管理）','替换为未命名方案；仅正文（Normal），无列表。基础字体为宋体 12 pt、西文 Times New Roman，1.5 倍行距；A4 纵向，四边页边距 2.54 cm，页眉页脚距离 1.27 cm'],
 ['清空样式与列表（左侧顶部垃圾桶）','删除除 Normal 外的样式及全部列表，保留当前正文格式、方案名称和页面设置；若没有 Normal，则创建基础正文。正文的后续段落恢复为自身'],
 ['删除当前对象（编辑区右上角）','只删除所选样式或列表，并调整继承、后续段落和列表引用；正文（Normal）也可删除'],
 ['导入后应用方案','用导入方案替换当前方案，不是合并；应用前显示报告'],
 ]}/>
 <p>以上替换和删除可在当前会话的撤销历史内恢复，最多保留 80 步修改。清空、新建和删除当前对象都会先显示确认框。打开使用文档不会清空编辑状态，点击“返回工作区”可继续操作。</p>
 <p>方案至少保留一个样式，最后一个样式无法删除。若方案中没有正文（Normal），导出时会自动补入默认段落样式。</p>
 <p>若顶部显示“待恢复”，表示上次保存的数据未通过读取或校验。网页暂时载入默认方案，并暂停自动保存以保留原数据。点击“下载恢复文件并继续”后，请确认浏览器已保存该文件；网页随后恢复自动保存当前方案。恢复文件保留原始数据，不保证能直接重新导入，必要时需修复后再用。</p>
 </Section>
 <Section id="styles" title="04 · 建立与管理样式">
 <ol><li>点击左侧“新建样式”或左侧栏顶部加号，填写名称，选择段落、字符、链接或表格类型，再选择基础样式。</li><li>进入“基本”选项卡，检查名称、别名、基础样式和后续段落。样式类型在创建时确定，选错时可重新创建。</li><li>按需要修改字体、段落、边框与制表位；表格样式另有“表格区域”。字符样式不提供段落设置。</li><li>要做相似变体，可点击编辑区右上角“复制”，再修改副本名称和格式；副本保留原来的基础样式和后续段落设置，编号关联需另外设置。</li></ol>
 <Table heads={['基本设置','含义与用法']} rows={[
 ['名称与别名','所有样式之间不能重名，不因类型不同而例外；列表名称在列表之间唯一。名称不能含英文逗号；别名可用英文逗号分隔'],
 ['基于样式','只允许兼容类型，不能循环继承。Normal 是独立基础样式'],
 ['后续段落样式','段落/链接样式可设置；正文后续通常选正文，标题后续通常也选正文'],
 ['加入快速样式','将样式标记为快速访问；启用时会取消隐藏'],
 ['推荐顺序','数值越小越靠前，Word 需采用推荐排序才有相应效果'],
 ['隐藏样式 / 使用后显示','控制样式的可见性；隐藏与加入快速样式互斥'],
 ['自动更新样式','在 Word 中改变使用该样式的段落格式时，可能连带更新样式及其他段落；需要固定规范时谨慎启用'],
 ]}/>
 <p>有编号需求的段落或链接样式，可在“基本 → 列表关联”中绑定列表层级。编号关联不随基础样式继承，每个需要编号的样式都要单独绑定。Normal 不允许绑定编号，以保留无编号的空白正文。单独新建一个“列表正文”样式更合适。</p>
 </Section>
 <Section id="format" title="05 · 字体、段落与边框">
 <h3>字体</h3><p>中文字体和西文字体可分别设置，例如中文宋体、英文 Times New Roman。字号以 pt 为单位；加粗、倾斜、下划线、颜色和文字底纹用于基本外观。字体名称不会把字体文件打包进 Word，使用设备仍需具备相应字体。</p>
 <p>“字符间距”控制字间距、横向缩放、上下位置和字距调整；删除线和上下标在“字体”组中，“文字效果与校对”包括大小写、隐藏、空心、阴影及校对语言等。OpenType 连字、数字形式、数字间距等依赖字体支持，网页不保证完整展示，需在 Word 中检查。文字底纹与荧光笔式“突出显示”不同；本站不把突出显示作为样式属性提供。</p>
 <h3>段落</h3><Table heads={['设置组','怎么理解']} rows={[
 ['对齐与缩进','选择左对齐、两端对齐等；左右缩进控制段落范围，首行缩进只影响第一行，负的首行缩进产生悬挂效果。可选厘米或字符单位'],
 ['间距与行距','段前/段后控制段落之间的空白，可用磅或行；多倍行距随字体变化，固定值锁定高度，最小值允许内容撑开'],
 ['换行与分页','“与下段同页”适合标题；“段中不分页”让一段尽量保持完整；“段前分页”适合章标题；孤行控制减少页首或页尾孤立的一行'],
 ['大纲级别','正文选正文级别，结构标题选相应层级；与列表编号的层级分开设置'],
 ['中文版式与高级设置','控制标点溢出、禁则、中西文间距、对齐网格等；具体效果由 Word 的排版环境决定'],
 ]}/>
 <h3>边框、底纹与制表位</h3><p>在“边框与制表位”中为段落添加指定方向的边框、线型、颜色、宽度及与文字距离，或设置段落底纹。制表位指定按 Tab 后文字对齐的位置，可选左、居中、右、小数点等对齐方式及点线等前导符。</p><p>制表位按位置继承：在某个位置设置“清除”可去掉继承的制表位，仅让本层列表为空不会清除上层定义。普通正文的制表位与列表“编号之后”的制表符、列表制表位是不同设置，编号对不齐时优先检查列表的位置设置。</p>
 </Section>
 <Section id="tables" title="06 · 表格样式">
 <p>“单元格段落”中的对齐控制单元格内的文字；要让整张表格在页面中居中，请进入“表格区域” → “整个表格”，将“整张表格对齐”设为“居中”。</p><ol><li>新建“表格”样式，切到“表格区域”。</li><li>先在“整个表格”配置“整张表格对齐”、单元格上下左右内边距及间距、垂直对齐、边框和底纹。</li><li>选择标题行、末行、首列、末列、奇偶条带行/列或四角单元格，启用“设置此区域的格式”。</li><li>分别设置该区域的底纹与边框、字体和段落；关闭只会移除此区域的设置，整表、基础样式和其他重叠区域仍可能影响结果。</li><li>导出后在 Word 中插入表格、应用该表格样式，并在表格设计中启用标题行、条带行等对应选项。单元格内另行应用的段落样式也可能覆盖表格的文字格式。</li></ol>
 <p>行/列条带大小决定多少行或列组成一个交替色块，当前支持 1–3。多个区域可能重叠，例如左上角同时属于标题行和首列，最终叠加效果请在 Word 中核对。默认空白导出不会插入表格，开启“包含样式示例”才会生成示例表格。</p>
 </Section>
 <Section id="lists" title="07 · 项目符号与编号列表">
 <Table heads={['选择哪种列表','用途','例子']} rows={[
 ['项目符号','没有递增序号的并列条目','• 材料齐全　• 格式统一'],
 ['编号列表','只有一层的连续步骤','1. 准备　2. 审核　3. 提交'],
 ['多级列表','有上下级关系的结构','1 → 1.1 → 1.1.1；也可混合数字和符号'],
 ]}/>
 <h3>项目符号</h3><p>点击左侧“新建项目符号”，命名后选择圆点、空心圆、方块、菱形等快捷符号，也可在“项目符号字符”中输入自定义字符。图片项目符号支持 1 MB 以内的 PNG/JPG，可调整宽高或移除图片。选择文字符号快捷项会移除原图片。</p><p>项目符号没有递增编号，因此不会显示“起始编号”“重新开始编号”“法律样式编号”。多级列表的某一级选为项目符号时也一样；切回数字编号后，之前的起始值仍会保留。</p>
 <h3>编号列表</h3><p>点击“新建编号列表”，选择阿拉伯数字、补零数字、罗马数字、字母或中文等编号形式，设置“起始编号”。例如起始值为 5、格式文本为 <code>%1.</code>，会得到 5.、6.、7.。格式文本中的占位符代表动态数字，括号和其他文字会原样显示。单级列表只使用 <code>%1</code>。</p>
 <h3>位置、字体与样式</h3><p>“编号对齐方式”控制标记自身的左右/居中对齐；“正文缩进位置”决定条目正文从哪里开始；“编号对齐位置”决定标记的位置。“编号之后”可选制表符、空格或不添加间隔，选制表符后再设置制表位位置。“编号字体”默认跟随关联样式或实际应用段落，跟随项只读显示；关联样式的值仅作为预览参考。点击某项的“单独设置”后才会出现编辑框并固定该项，点击“恢复跟随”可移除该项独立设置。标题显示已单独设置的项数，也可点击“全部恢复跟随”统一清除。</p><p>建议关联一个专用段落样式，例如“步骤正文”或“项目正文”。关联后，导出的 Word 文件应用该段落样式就能带入列表定义。Word 的列表功能背景可参考<a href="https://support.microsoft.com/en-au/word/define-new-bullets-numbers-and-multilevel-lists" target="_blank" rel="noreferrer">微软的列表定义说明</a>。</p>
 </Section>
 <Section id="multilevel" title="08 · 多级列表与样式关联">
 <ol><li>新建多级列表，或选择已有的“标题层级”。每套多级列表包含九级，可以只使用其中几级。</li><li>点击 1–9 选择当前层级，各级分别设置编号样式、格式文本、起始值和位置。</li><li>在“链接到样式”中把当前级别关联到对应标题或正文样式；也可从样式的“列表关联”反向操作。</li><li>配置低级编号在上级变化后是否重新开始，再通过右侧“编号测试”检查一串条目的变化。</li></ol>
 <Table heads={['示例层级','编号样式 / 格式文本','起始效果']} rows={[
 ['第一级','中文数字 / 第%1章','第一章'],
 ['第二级','阿拉伯数字 / %1.%2','一.1（保留上级中文格式）'],
 ['第二级，启用法律样式编号','阿拉伯数字 / %1.%2','1.1（引用的编号使用阿拉伯数字）'],
 ['第三级','阿拉伯数字 / （%3）','（1）'],
 ]}/>
 <p><code>%1</code> 指第一级计数，<code>%2</code> 指第二级，以此类推。每一级只能引用自己及上级，不能提前引用尚未出现的下级。格式文本的分隔符由你输入，例如 <code>%1.%2</code> 与 <code>%1-%2</code>。</p>
 <h3>重新开始编号</h3><p>假设第二级起始为 1，选择“第 1 级出现后重新开始”：从第一章转到第二章后，第二级会重新从 1 开始。选择“不重新开始”则连续计数。这里定义的是列表规则；Word 中针对某个实际段落的“继续编号 / 重新开始”属于正文编辑，不在本网页中操作。</p>
 <h3>关联规则与高级设置</h3><p>本站每个层级最多关联一个段落/链接样式，同一样式也只能绑定一个层级。已有绑定冲突时会弹出确认，确认后转移关联。字符、表格样式和 Normal 不可用作编号关联。复制列表会清除副本的样式绑定，需要重新选择。</p><p>“列表默认级别”决定应用命名列表样式时默认使用哪一级。“LISTNUM 名称”供 Word 的 LISTNUM 域引用，普通标题编号通常不需要填写，留空使用列表名称。列表可以命名，但客户端画廊显示受 Word 版本和设置影响，并非保证出现在某个固定位置。</p>
 </Section>
 <Section id="preview" title="09 · 页面设置与实时预览">
 <p>左侧“页面设置”支持 A4、A5、Letter，横向或纵向，上下左右页边距、装订线、页眉距顶端、页脚距底端和默认制表位间距。厘米数值过大、挤占正文区域时会提示错误，修正后才能导出。页眉页脚距离会写入 Word，但不添加页眉页脚内容，网页也不模拟该区域。</p>
 <Table heads={['预览模式','查看内容']} rows={[
 ['整体效果','报告方案可切换封面、目录、正文、图表场景；选择相应样式会切换场景。示例不是你导入文件的正文'],
 ['当前样式 / 当前列表','聚焦当前选中对象，便于检查局部设置'],
 ['编号测试','列表选中时可用；默认测试全部九级的递进与返回，也可选当前级连续编号、上级变化，或自定义 1—9 级序列（最多 100 项）。单级列表只接受第 1 级。测试使用当前起始值、格式与重启规则'],
 ]}/>
 <p className="guide-callout">预览帮助判断样式关系，不等同于 Word 排版引擎。页面会随示例内容延长，不按 Word 规则分页；段前分页、与下段同页等需在 Word 中验收。制表符和高级字体效果也只作近似展示，隐藏文字在网页中仍以淡色显示。</p>
 <p>表格预览会合并基础样式及条件区域的字体、段落、底纹和边框，并按行列条带大小分组；示例会扩展行列数以展示两组条带。在“当前样式”中可单独开关标题行、末行、首末列及行列条带；这些开关只影响预览，不修改导出。重叠区域会按优先级覆盖，因此查看行条带时可先关闭列条带。浏览器的共享边框冲突处理和整表位置仍可能与 Word 不同，请导出示例核对。网页的报告场景与导出的逐项验收示例是两套示例内容，不会一一对应。</p>
 </Section>
 <Section id="import" title="10 · 导入已有文件">
 <ol><li>点击顶部“导入”，或方案管理中的“导入方案或 Word 文件”。</li><li>选择不超过 10 MB 的 JSON、DOCX 或 DOTX；Word 文件解压后不能超过 40 MB。旧版 .doc、带宏格式和加密文件不在支持范围内。</li><li>阅读“检查导入方案”：核对名称、样式与列表数量，以及每条导入说明。</li><li>点击“应用方案”才会替换当前方案；取消则保持原状。建议在替换前下载现有方案的 JSON 备份。</li></ol>
 <Table heads={['文件来源','导入行为']} rows={[
 ['本站 JSON 备份','校验通过后恢复完整可编辑方案，包括样式、列表和页面设置；无效配置需先修复'],
 ['本站导出的 DOCX / DOTX','优先恢复文件内嵌的方案备份；可较完整地找回网页设置'],
 ['其他 Word 文档 / 模板','解析支持的样式、列表与页面属性；不支持或无法完整映射的内容会列入报告'],
 ]}/>
 <p><strong>不保留正文。</strong>导入不是在线修改原 Word 文件：正文、页眉页脚、批注、修订、宏等内容不会跟随新导出文件保留。外部图片项目符号不会导入，其他特殊设置也可能丢失，不能当作无损转换。</p><p>外部 Word 文件只导入最多 200 个样式和 30 套列表；缺失的多级列表层级会补齐到九级。多节文档只采用最后一节的页面设置，自定义纸张会改为 A4，以上调整会列入导入说明。外部文件中的“自动更新样式”标记会按文件定义恢复，可在“基本”中查看。</p><p><strong>在 Word 中改过本站文件时要特别注意：</strong>内嵌方案不会随 Word 编辑自动更新，导入恢复的可能是原始网页配置，而不是最新的 Word 格式。当前没有在界面切换到“忽略内嵌方案”的选项；导入报告会提示这一点。内嵌方案缺失或无法通过校验时，才会尝试解析 Word 中支持的样式。请保留原文件并核对结果。</p>
 </Section>
 <Section id="export" title="11 · 导出与在 Word 中使用">
 <ol><li>确认顶部没有“待完善”，点击“导出 Word”。</li><li>选择 DOCX 文档或 DOTX 模板；按需要开启“包含样式示例”。</li><li>下载后在桌面 Word 中打开检查。默认导出只保留空白正文，但样式和列表定义已在文件内。</li><li>写作时，把光标放入段落并应用相应段落/标题样式；字符样式应用于选中文字，表格样式应用于表格。关联编号的样式会带入列表格式。</li></ol>
 <Table heads={['格式','适合的用途']} rows={[
 ['DOCX','直接打开并在这份文件中写作'],
 ['DOTX','作为可反复使用的模板，从模板创建新文档；这是模板格式，不是简单改扩展名'],
 ['JSON','备份网页方案、换设备或继续编辑；不是 Word 文档'],
 ]}/>
 <p>使用 DOTX 时，可通过 Word 的模板新建流程创建文档；不同系统的入口可能不同。参见<a href="https://support.microsoft.com/en-us/word/save-a-word-document-as-a-template" target="_blank" rel="noreferrer">微软的 Word 模板说明</a>。本站导出不含宏，也不会安装字体或修改你的 Word 全局默认模板。</p>
 <p>若快速样式栏未显示某个样式，先到 Word 的样式窗格查找，检查本站的“加入快速样式”“隐藏样式”和 Word 的样式显示/排序设置。列表编号仍应通过样式或列表应用，不要手工输入序号覆盖它。</p>
 </Section>
 <Section id="example" title="12 · 实战：建立一份三级报告模板">
 <p>从默认报告示例开始。目标：正文统一排版，标题按 1、1.1、1.1.1 自动编号，第一章和第二章的下级编号分别从 1 开始。</p>
 <ol><li><strong>正文：</strong>选择“报告正文”，设中文宋体、西文 Times New Roman、12 pt，在段落中设 1.5 倍行距。</li><li><strong>标题格式：</strong>依次选默认一、二、三级标题，设黑体和递减字号，例如 20 / 16 / 14 pt；按需要调整段前段后间距，启用“与下段同页”。这些数值只是示例，可按自己的规范修改。</li><li><strong>结构：</strong>在三个标题的“段落”中分别确认大纲级别为 1 / 2 / 3 级；后续段落样式设为“报告正文”。</li><li><strong>列表：</strong>选择“标题层级”，前三层均选阿拉伯数字，格式文本依次为 <code>%1</code>、<code>%1.%2</code>、<code>%1.%2.%3</code>，起始值均为 1。</li><li><strong>关联与重启：</strong>第一级链接一级标题，第二级链接二级标题并在第一级出现后重启，第三级链接三级标题并在第二级出现后重启。若使用默认方案，这些关联通常已存在，核对即可。</li><li><strong>检查：</strong>切换到“编号测试”，观察 1 → 1.1 → 1.1.1，以及下一个章节的 2 → 2.1 → 2.1.1。若不一致，逐层检查编号格式和重启条件。</li><li><strong>交付：</strong>导出带样式示例的 DOCX 检查字体、对齐和编号；满意后导出空白 DOTX，并另外保存一份 JSON。</li></ol>
 <p>报告中的普通条目应另建“项目正文”或“步骤正文”段落样式，绑定独立项目符号或编号列表，避免占用标题层级的关联。</p>
 </Section>
 <Section id="faq" title="13 · 常见问题与功能边界">
 <h3>为什么改了正文，标题也变了？</h3><p>标题基于正文且该属性没有单独覆盖。若希望独立，直接为标题指定该属性；若希望恢复跟随正文，使用字段旁的重置按钮。</p>
 <h3>为什么起始编号不见了？</h3><p>当前层级选择了项目符号或无编号。它们不使用递增起始值；切回数字编号即可看到起始设置。</p>
 <h3>为什么不能绑定同一个样式到多个层级？</h3><p>本站用唯一关联确定应用样式时应使用的列表和层级。需要不同层级时，请分别建立段落/链接样式；不能把无编号的 Normal 绑定到列表。</p>
 <h3>为什么导出文件看起来空白？</h3><p>默认目标就是空白模板，规则在样式与列表定义里。需要可见示例时，导出前开启“包含样式示例”；需要原文正文时，请回到原文件，本站不会保留导入正文。</p>
 <h3>为什么网页和 Word 显示不一样？</h3><p>先检查设备字体，再核对样式是否应用、是否有直接格式覆盖，以及表格的标题行/条带选项。网页不是 Word 排版引擎，高级字体、复杂表格和分页需要以实际客户端检查为准。</p>
 <h3>清空后还能恢复吗？刷新后呢？</h3><p>清空后立即点击顶部撤销可恢复；历史最多保留 80 步修改。刷新会丢失撤销历史，此时需要导入之前保存的 JSON 或可恢复的 Word 文件；本站没有云端历史版本或回收站。</p>
 <h3>文件会上传吗？可以多人协作吗？</h3><p>导入解析、编辑、导出都在浏览器本地处理，目前没有账号、云同步或多人协作。打开本页的微软参考链接会访问外部网站，但不会自动上传方案文件。</p>
 <h3>目前覆盖到哪里？</h3><p>已覆盖四类样式、继承与快速样式、字体和段落、边框制表位、表格条件区域、三类列表、样式关联、页面设置及导入导出。每个方案最多 200 个样式、30 套列表，多级列表每套九级。</p><p>尚未完整覆盖 Word 全部能力，例如全局快捷键、格式限制和样式锁定、主题字体动态切换、全部语言编号和装饰边框、文档网格尺寸编辑、外部图片项目符号导入。网页不编辑正文、不生成目录正文，也不保证不同 Word/WPS 版本显示完全一致。外部文件导入有损，重要文件请保留原件。</p>
 </Section>
 </>}
 <footer className="guide-footer"><p>{t('本文对应当前网站功能。Word 基础概念附有微软支持文档，具体菜单以所用版本为准。','This guide describes the current app. Microsoft Support links explain Word concepts; exact menus depend on your version.')}</p><a href="#workspace">{t('返回工作区，开始设置','Back to workspace to set up your styles')} <ArrowUpRight size={16}/></a><a href="#guide">{t('回到文档顶部 ↑','Back to the top ↑')}</a></footer>
 </main></div></div>;
}
