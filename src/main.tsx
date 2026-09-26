import React, { lazy, Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider, useI18n } from './i18n';
import Home from './Home';
import './styles.css';

const Guide = lazy(() => import('./Guide'));
function Root(){
 const {locale,t}=useI18n();
 const [hash,setHash]=useState(window.location.hash);
 const workspace=hash.startsWith('#workspace');
 const [visited,setVisited]=useState(workspace);
 useEffect(()=>{if(workspace)setVisited(true);},[workspace]);
 const guide=hash==='#guide'||hash.startsWith('#guide-');
 useEffect(()=>{
  const change=()=>{
   const nextHash=window.location.hash;
   // 清理首页空锚点，不刷新页面或新增历史记录，保留工作区状态。
   if(nextHash===''&&window.location.href.endsWith('#'))window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search);
   setHash(nextHash);
  };
  change();
  window.addEventListener('hashchange',change);
  return()=>window.removeEventListener('hashchange',change);
 },[]);
 useEffect(()=>{document.title=guide?t('使用文档 · 字序 Word 样式工作室','User guide · Word Style Studio'):t('字序 · Word 样式工作室','Word Style Studio');},[guide,locale,t]);
 useEffect(()=>{if(!guide)window.scrollTo(0,0);},[guide]);
 // 保持工作区挂载，阅读文档时不丢失未保存输入、选择和撤销历史。
 return <>{(visited||workspace)&&<div hidden={!workspace}><App active={workspace}/></div>}{!workspace&&!guide&&<Home/>}{guide&&<Suspense fallback={<div className="guide-loading">{t('正在打开使用文档…','Opening the user guide…')} <a href="#workspace">{t('返回工作区','Back to workspace')}</a></div>}><Guide hash={hash}/></Suspense>}</>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><I18nProvider><Root /></I18nProvider></React.StrictMode>);
