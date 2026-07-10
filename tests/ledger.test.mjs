/* Ledger 模块测试：node tests/ledger.test.mjs
   覆盖：setup/checkIn/持久化格式、错口令、篡改检测、share 只读往返、旧格式兼容 */
import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const src=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'..','ledger.js'),'utf8');
(0,eval)(src); // 定义到 globalThis.Ledger（文件末尾用 window||globalThis）
const Ledger=globalThis.Ledger;
assert.ok(Ledger&&Ledger.create,'Ledger.create 存在');

function memStorage(init){let data=init??null;return {load:()=>data,save:o=>{data=JSON.parse(JSON.stringify(o));},dump:()=>data};}
const fixedToday=()=>'2026-07-02';

// 1. setup + checkIn + 查询
{
  const st=memStorage();
  const lg=Ledger.create({storage:st,today:fixedToday});
  assert.equal(await lg.load(''),'local');
  assert.equal(lg.hasIdentity,false);
  const fp=await lg.setup('test-pass');
  assert.match(fp,/^NP-[0-9A-Z]{3}-[0-9A-Z]{3}$/,'指纹格式');
  assert.ok(lg.unlocked);
  const rec=await lg.checkIn('yosemite');
  assert.equal(rec.d,'2026-07-02');
  assert.ok(lg.isVisited('yosemite'));
  assert.ok(!lg.isTamper('yosemite'));
  // 持久化格式（np_v1 兼容）：idn{salt,iv,enc,pub,fp} + recs{id:{d,n,s}}
  const d=st.dump();
  for(const k of ['salt','iv','enc','pub','fp'])assert.ok(d.idn[k]!=null,'idn.'+k);
  assert.deepEqual(Object.keys(d.recs.yosemite).sort(),['d','n','s'],'rec 字段');
}

// 2. 重载后仍有效；错口令 unlock=false；对口令成功后可再打卡
{
  const st=memStorage();
  let lg=Ledger.create({storage:st,today:fixedToday});
  await lg.load('');await lg.setup('pw1234');await lg.checkIn('zion');
  lg=Ledger.create({storage:st,today:fixedToday});
  assert.equal(await lg.load(''),'local');
  assert.ok(lg.isVisited('zion'),'重载后验签通过');
  assert.ok(!lg.unlocked);
  assert.equal(await lg.unlock('wrong'),false);
  assert.equal(await lg.unlock('pw1234'),true);
  await lg.checkIn('arches');
  assert.ok(lg.isVisited('arches'));
}

// 3. 篡改检测：改日期 → isTamper
{
  const st=memStorage();
  let lg=Ledger.create({storage:st,today:fixedToday});
  await lg.load('');await lg.setup('pw1234');await lg.checkIn('denali');
  const d=st.dump();d.recs.denali.d='2020-01-01';
  lg=Ledger.create({storage:st});
  await lg.load('');
  assert.ok(lg.isTamper('denali'));
  assert.ok(!lg.isVisited('denali'));
}

// 4. share 往返：只读、验签、record 可读；篡改的 share 标异常
{
  const st=memStorage();
  const owner=Ledger.create({storage:st,today:fixedToday});
  await owner.load('');await owner.setup('pw1234');await owner.checkIn('acadia');
  const frag=owner.shareFragment();
  assert.ok(frag.startsWith('share='));
  const viewer=Ledger.create({storage:null});
  assert.equal(await viewer.load('#'+frag),'share');
  assert.ok(viewer.readonly);
  assert.ok(viewer.isVisited('acadia'));
  assert.equal(viewer.record('acadia').d,'2026-07-02');
  await assert.rejects(()=>viewer.checkIn('zion'),/readonly/);
  // 篡改 share 内容
  const b64u=s=>Buffer.from(s,'utf8').toString('base64url');
  const raw=JSON.parse(Buffer.from(frag.slice(6),'base64url').toString('utf8'));
  raw.recs.acadia.d='1999-09-09';
  const bad=Ledger.create({storage:null});
  await bad.load('#share='+b64u(JSON.stringify(raw)));
  assert.ok(bad.isTamper('acadia'),'篡改后的 share 记录标异常');
}

// 5. remove
{
  const st=memStorage();
  const lg=Ledger.create({storage:st,today:fixedToday});
  await lg.load('');await lg.setup('pw1234');await lg.checkIn('zion');
  lg.remove('zion');
  assert.ok(!lg.isVisited('zion'));
  assert.equal(st.dump().recs.zion,undefined,'持久化同步删除');
}

// 6. 云存档：导出→新设备只凭口令恢复；错口令恢复失败；查找键确定性
{
  const st=memStorage();
  const a=Ledger.create({storage:st,today:fixedToday});
  await a.load('');await a.setup('pw1234');await a.checkIn('yosemite');await a.checkIn('zion');
  const bundle=await a.exportCloud();
  for(const k of ['v','id','fp','pub','salt','iv','ct','sig'])assert.ok(bundle[k]!=null,'bundle.'+k);
  assert.match(bundle.id,/^[0-9a-f]{32}$/,'查找键格式');
  assert.equal(bundle.id,await a.cloudId('pw1234'),'查找键与口令一致');
  assert.notEqual(bundle.id,await a.cloudId('pw1235'),'不同口令不同键');
  // 密文里不出现明文公园 id
  assert.ok(!bundle.ct.includes('yosemite')&&!JSON.stringify(bundle).includes('"recs"'),'存档已加密');
  // 新设备恢复
  const st2=memStorage();
  const b=Ledger.create({storage:st2,today:fixedToday});
  await b.load('');
  assert.equal(await b.importCloud('wrong',bundle),false,'错口令恢复失败');
  const fp=await b.importCloud('pw1234',bundle);
  assert.equal(fp,a.fp,'恢复后同一编号');
  assert.ok(b.unlocked&&b.isVisited('yosemite')&&b.isVisited('zion'),'恢复后已解锁且记录验签通过');
  assert.ok(st2.dump().idn,'恢复已持久化');
  await b.checkIn('acadia');
  assert.ok(b.isVisited('acadia'),'恢复后可继续打卡');
}

// 7. 云存档签名可用公钥验证（Worker 验签同一算法）；改动密文即失效
{
  const st=memStorage();
  const a=Ledger.create({storage:st,today:fixedToday});
  await a.load('');await a.setup('pw1234');await a.checkIn('denali');
  const bd=await a.exportCloud();
  const subtle=globalThis.crypto.subtle;
  const key=await subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:bd.pub.x,y:bd.pub.y},{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const ub=s=>new Uint8Array(Buffer.from(s,'base64'));
  assert.ok(await subtle.verify({name:'ECDSA',hash:'SHA-256'},key,ub(bd.sig),ub(bd.ct)),'签名验证通过');
  const bad=new Uint8Array(ub(bd.ct));bad[0]^=1;
  assert.ok(!await subtle.verify({name:'ECDSA',hash:'SHA-256'},key,ub(bd.sig),bad),'改密文验签失败');
}

// 8. mergeCloud：同身份多设备合并；不同身份拒绝
{
  const st=memStorage();
  const a=Ledger.create({storage:st,today:fixedToday});
  await a.load('');await a.setup('pw1234');await a.checkIn('zion');
  // 设备 B 恢复后各自打卡
  const stB=memStorage();
  const b=Ledger.create({storage:stB,today:fixedToday});
  await b.load('');await b.importCloud('pw1234',await a.exportCloud());
  await b.checkIn('arches');
  await a.checkIn('acadia');
  const m=await a.mergeCloud(await b.exportCloud());
  assert.deepEqual(m,{added:1,extra:1},'收 1 条（arches），本地多 1 条（acadia）待回传');
  assert.ok(a.isVisited('arches')&&a.isVisited('acadia')&&a.isVisited('zion'));
  // 不同身份
  const c=Ledger.create({storage:memStorage(),today:fixedToday});
  await c.load('');await c.setup('pw1234');
  assert.equal(await a.mergeCloud(await c.exportCloud()),null,'不同身份拒绝合并');
  // 锁定后 exportCloud 抛错
  a.lock();
  await assert.rejects(()=>a.exportCloud(),/locked/);
}

// 9. 多图鉴槽位切换：load 空槽必须清干净上一本（v28 线上污染 bug 回归）
{
  let slot='A';
  const slots={A:null,B:null};
  const st={load:()=>slots[slot],save:o=>{slots[slot]=JSON.parse(JSON.stringify(o));}};
  const lg=Ledger.create({storage:st,today:fixedToday});
  await lg.load('');await lg.setup('pass-a');await lg.checkIn('yosemite');
  slot='B';await lg.load('');
  assert.equal(lg.hasIdentity,false,'空槽 load 后无身份残留');
  assert.ok(!lg.isVisited('yosemite')&&!lg.isTamper('yosemite'),'空槽无记录残留');
  assert.ok(!lg.unlocked,'切槽后已锁');
  // setup 清旧记录：先污染 S 再 setup，新图鉴不得带旧记录
  slots.B={idn:null,recs:{zion:{d:'2026-01-01',n:'',s:'AAAA'}}};
  await lg.load('');
  await lg.setup('pass-b');
  assert.ok(!lg.record('zion'),'setup 后旧记录清空');
  assert.ok(!slots.B.recs.zion,'持久化里也没有');
}

// 10. exportCloud 只带验签通过的记录：坏记录不进云
{
  const st=memStorage();
  const lg=Ledger.create({storage:st,today:fixedToday});
  await lg.load('');await lg.setup('pw1234');await lg.checkIn('yosemite');
  const d=st.dump();d.recs.badone={d:'2020-01-01',n:'',s:'Zm9v'};
  const lg2=Ledger.create({storage:{load:()=>d,save:()=>{}},today:fixedToday});
  await lg2.load('');await lg2.unlock('pw1234');
  assert.ok(lg2.isTamper('badone'),'坏记录标异常');
  const bundle=await lg2.exportCloud();
  const fresh=Ledger.create({storage:memStorage(),today:fixedToday});
  await fresh.load('');
  await fresh.importCloud('pw1234',bundle);
  assert.ok(fresh.isVisited('yosemite'),'好记录在');
  assert.ok(!fresh.record('badone'),'坏记录没进云存档');
}

// 11. purgeInvalid：坏记录一键清除并持久化；好记录不动；share 模式不动
{
  const st=memStorage();
  const lg=Ledger.create({storage:st,today:fixedToday});
  await lg.load('');await lg.setup('pw1234');await lg.checkIn('yosemite');
  const d=st.dump();d.recs.bad1={d:'2020-01-01',n:'',s:'Zm9v'};d.recs.bad2={d:'2020-01-02',n:'',s:'YmFy'};
  const lg2=Ledger.create({storage:{load:()=>d,save:o=>{Object.assign(d,JSON.parse(JSON.stringify(o)));}},today:fixedToday});
  await lg2.load('');
  assert.equal(lg2.purgeInvalid(),2,'清掉 2 条坏记录');
  assert.ok(lg2.isVisited('yosemite')&&!lg2.record('bad1')&&!lg2.record('bad2'));
  assert.ok(!d.recs.bad1,'持久化同步删除');
  assert.equal(lg2.purgeInvalid(),0,'再清无事');
  // share 只读不动
  const owner=Ledger.create({storage:memStorage(),today:fixedToday});
  await owner.load('');await owner.setup('pw1234');await owner.checkIn('zion');
  const viewer=Ledger.create({storage:null});
  await viewer.load('#'+owner.shareFragment());
  assert.equal(viewer.purgeInvalid(),0,'share 模式不清');
}

// 12. 补打往日卡：checkIn 带日期，签名含该日期，重载验签通过；坏格式回落今天
{
  const st=memStorage();
  let lg=Ledger.create({storage:st,today:fixedToday});
  await lg.load('');await lg.setup('pw1234');
  const rec=await lg.checkIn('zion','','2025-05-01');
  assert.equal(rec.d,'2025-05-01','用所选日期');
  const bad=await lg.checkIn('arches','','01/02/2025');
  assert.equal(bad.d,'2026-07-02','坏格式回落今天');
  lg=Ledger.create({storage:st,today:fixedToday});
  await lg.load('');
  assert.ok(lg.isVisited('zion')&&lg.record('zion').d==='2025-05-01','重载验签通过');
}

console.log('ledger.test: all passed');
