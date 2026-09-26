import React, { lazy, Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Home from './Home';
import './styles.css';

const Guide = lazy(() => import('./Guide'));
function Root(){
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
 useEffect(()=>{document.title=guide?'使用文档 · 字序 Word 样式工作室':'字序 · Word 样式工作室';if(!guide)window.scrollTo(0,0);},[guide]);
 // 保持工作区挂载，阅读文档时不丢失未保存输入、选择和撤销历史。
 return <>{(visited||workspace)&&<div hidden={!workspace}><App active={workspace}/></div>}{!workspace&&!guide&&<Home/>}{guide&&<Suspense fallback={<div className="guide-loading">正在打开使用文档… <a href="#workspace">返回工作区</a></div>}><Guide hash={hash}/></Suspense>}</>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Root /></React.StrictMode>);
