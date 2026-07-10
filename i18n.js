/* Parks Atlas — i18n. String table + t() + language state.
   Park content (names/intros/highlights) is bilingual in data.js;
   this file covers every other visible string.
   Entries may be strings or functions (called with t()'s extra args). */
(function(root){
"use strict";
const STR={
zh:{
  title:'美国国家公园打卡图鉴',
  appName:'公园图鉴',
  htitle:'国家公园图鉴', htsub:'U.S. NATIONAL PARKS',
  share:'分享',
  ofParks:'/ 63 座',
  subLit:p=>'已点亮 <b>'+p+'%</b>', subStates:s=>'已走过的州 <b>'+s+'</b>', subLatest:d=>'最近 '+d,
  legendOff:'未点亮', legendOn:'已点亮',
  helpLink:'玩法说明', helpTitle:'玩法',
  helpBody:'① 点一个州进入；<br>② 长按公园徽章半秒，手指刮开即打卡；<br>③ 「分享」生成只读链接。',
  helpNote:'打卡自动云存档；记录带签名，改动会标红「异常」。',
  gotIt:'明白了', ok:'好的', cancel:'取消', close:'关闭', back:'返回',
  gateTitle:'口令', enter:'进入', passMin:'口令至少 4 位', gateWrong:'口令不对，请重输',
  newPassTitle:'新口令', newPassBody:'用它开一本新图鉴？', newAtlas:'开新图鉴',
  dateTitle:'打卡日期', stampGo:'打卡',
  restored:fp=>'已恢复 · '+fp,
  cloudSynced:n=>'已从云端同步 '+n+' 条打卡',
  cloudBoundPush:'该口令已绑定另一份图鉴，云存档未更新',
  cloudBoundSync:'该口令已绑定另一份图鉴，云同步停用',
  cloudFail:'云同步失败，下次打卡自动重试',
  purged:n=>'已清除 '+n+' 条异常记录',
  litToast:name=>'已点亮 · '+name,
  unstamped:'已取消打卡', copied:'已复制', copySel:'已选中，长按复制',
  shareTitle:'分享图鉴', shareFirst:'先打一张卡。',
  shareBody:'只读链接：朋友可看、可验真，改不了。', copyLink:'复制链接',
  roBanner:fp=>'👁 只读分享卡片 · 编号 '+fp, roTamper:' · ⚠ 含异常记录',
  tamperBanner:'⚠ 有打卡记录签名验证失败，可能被改动过（已标红，不计入进度）。',
  noCrypto:'当前环境不支持 Web Crypto（请用 https 打开）。',
  mapFailComp:'地图组件未能加载，已切换到列表模式。',
  mapFailData:'地图数据加载失败（可能离线），已切换到列表模式。',
  backNation:'‹ 全美', svCount:(a,b)=>'<b id="svDone">'+a+'</b>/'+b+' 座<br>已点亮',
  noParks:name=>name+'目前还没有国家公园', tryAnother:'换个州试试 →',
  territories:'海外属地',
  est:'设立 ', visitedPill:'✓ 已打卡 · ', sigBad:'⚠ 签名异常',
  highlights:'✨ 亮点：', readonly:'👁 只读', litOn:'✓ 已点亮 · ',
  holdStamp:'长按盖章打卡 🅿️', holdUnstamp:'长按取消打卡',
  holdRemoveBad:'长按删除异常记录', holdDelete:'长按删除',
  npSuffix:p=>p.en+' National Park', npSuffixShort:p=>p.en+' NP',
  langBtn:'EN'
},
en:{
  title:'U.S. National Parks Scratch-Off Atlas',
  appName:'Parks Atlas',
  htitle:'National Parks Atlas', htsub:'SCRATCH-OFF · U.S.A.',
  share:'Share',
  ofParks:'/ 63 parks',
  subLit:p=>'Lit <b>'+p+'%</b>', subStates:s=>'States visited <b>'+s+'</b>', subLatest:d=>'Latest '+d,
  legendOff:'Unlit', legendOn:'Lit',
  helpLink:'How to play', helpTitle:'How to play',
  helpBody:'① Tap a state to enter.<br>② Press and hold a park badge for half a second, then scratch it open to check in.<br>③ “Share” creates a read-only link.',
  helpNote:'Check-ins are archived to the cloud automatically. Records are signed — any tampering shows up flagged in red.',
  gotIt:'Got it', ok:'OK', cancel:'Cancel', close:'Close', back:'Back',
  gateTitle:'Passphrase', enter:'Enter', passMin:'Passphrase needs at least 4 characters', gateWrong:'Wrong passphrase, try again',
  newPassTitle:'New passphrase', newPassBody:'Start a new atlas with it?', newAtlas:'New atlas',
  dateTitle:'Check-in date', stampGo:'Check in',
  restored:fp=>'Restored · '+fp,
  cloudSynced:n=>'Synced '+n+' check-in'+(n>1?'s':'')+' from the cloud',
  cloudBoundPush:'This passphrase is bound to a different atlas — cloud archive not updated',
  cloudBoundSync:'This passphrase is bound to a different atlas — cloud sync disabled',
  cloudFail:'Cloud sync failed — will retry on your next check-in',
  purged:n=>'Removed '+n+' invalid record'+(n>1?'s':''),
  litToast:name=>'Lit · '+name,
  unstamped:'Check-in removed', copied:'Copied', copySel:'Selected — long-press to copy',
  shareTitle:'Share your atlas', shareFirst:'Check in somewhere first.',
  shareBody:'A read-only link: friends can view it and verify it, but cannot change it.', copyLink:'Copy link',
  roBanner:fp=>'👁 Read-only shared atlas · ID '+fp, roTamper:' · ⚠ contains invalid records',
  tamperBanner:'⚠ Some check-in signatures failed verification and may have been tampered with (flagged red, not counted).',
  noCrypto:'Web Crypto is unavailable here (open the page over https).',
  mapFailComp:'Map libraries failed to load — showing list view.',
  mapFailData:'Map data failed to load (offline?) — showing list view.',
  backNation:'‹ USA', svCount:(a,b)=>'<b id="svDone">'+a+'</b>/'+b+' parks<br>lit',
  noParks:name=>'No national parks in '+name+' yet', tryAnother:'Try another state →',
  territories:'Territories',
  est:'Est. ', visitedPill:'✓ Visited · ', sigBad:'⚠ Invalid signature',
  highlights:'✨ Highlights: ', readonly:'👁 Read-only', litOn:'✓ Lit · ',
  holdStamp:'Hold to stamp 🅿️', holdUnstamp:'Hold to undo check-in',
  holdRemoveBad:'Hold to delete invalid record', holdDelete:'Hold to delete',
  npSuffix:p=>'National Park · '+p.zh, npSuffixShort:p=>p.zh,
  langBtn:'中'
}};
const REGION_EN={'东北':'Northeast','东南':'Southeast','落基山':'Rockies','西南':'Southwest','加州':'California','西北':'Northwest','大平原':'Great Plains','中西部':'Midwest','阿拉斯加':'Alaska','夏威夷':'Hawaii','属地':'Territories'};

const cfg=root.ATLAS_CONFIG||{};
let lang;
try{lang=localStorage.getItem('np_lang');}catch(e){}
if(lang!=='zh'&&lang!=='en'){
  const def=cfg.DEFAULT_LANG||'auto';
  lang=(def==='zh'||def==='en')?def:((navigator.language||'').toLowerCase().indexOf('zh')===0?'zh':'en');
}
function t(key){const e=STR[lang][key];if(e===undefined)return key;if(typeof e==='function')return e.apply(null,[].slice.call(arguments,1));return e;}
root.I18N={
  t:t,
  get lang(){return lang;},
  set(l){if(l!=='zh'&&l!=='en')return;lang=l;try{localStorage.setItem('np_lang',l);}catch(e){}},
  region(rg){return lang==='zh'?rg:(REGION_EN[rg]||rg);},
  park(p){return lang==='zh'?p.zh:p.en;},
  parkSt(p){return lang==='zh'?p.st:p.stEn;},
  parkIntro(p){return lang==='zh'?p.intro:p.introEn;},
  parkHl(p){return lang==='zh'?p.hl:p.hlEn;},
  state(s){return lang==='zh'?s.zh:s.name;},
  stateSub(s){return lang==='zh'?s.name:s.zh;},
  tier(row){return lang==='zh'?row[1]:row[2];}
};
})(typeof window!=='undefined'?window:globalThis);
