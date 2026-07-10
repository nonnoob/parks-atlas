/* Cloud Worker 测试：node tests/cloud-worker.test.mjs
   模拟 GitHub Contents API，覆盖：首写 TOFU、读回、同身份更新、异身份 409、改密文 403、坏请求 400 */
import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const dir=dirname(fileURLToPath(import.meta.url));
const worker=(await import(join(dir,'..','worker','cloud-worker.js'))).default;

const src=readFileSync(join(dir,'..','ledger.js'),'utf8');
(0,eval)(src);
const Ledger=globalThis.Ledger;
const mem=s=>{let d=null;return {load:()=>d,save:o=>{d=JSON.parse(JSON.stringify(o));}};};

/* 内存版 GitHub Contents API */
const store={}; // path -> {content(b64), sha}
let shaN=0;
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,init={})=>{
  const u=String(url);
  if(!u.startsWith('https://api.github.com/'))return realFetch(url,init);
  assert.ok((init.headers||{}).authorization==='Bearer TEST_TOKEN','带 token');
  const m=u.match(/contents\/([^?]+)/);const path=decodeURIComponent(m[1]);
  if((init.method||'GET')==='GET'){
    const f=store[path];
    if(!f)return new Response('{"message":"Not Found"}',{status:404});
    return new Response(JSON.stringify({content:f.content,sha:f.sha}),{status:200});
  }
  if(init.method==='PUT'){
    const body=JSON.parse(init.body);
    const f=store[path];
    if(f&&body.sha!==f.sha)return new Response('{"message":"conflict"}',{status:409});
    if(!f&&body.sha)return new Response('{"message":"conflict"}',{status:422});
    store[path]={content:body.content,sha:'sha'+(++shaN)};
    return new Response('{}',{status:f?200:201});
  }
  return new Response('{}',{status:405});
};

const env={GH_TOKEN:'TEST_TOKEN'};
const call=(method,pathq,body)=>worker.fetch(new Request('https://w.test'+pathq,{method,...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})}),env);

// 准备一份真实 bundle
const a=Ledger.create({storage:mem(),today:()=>'2026-07-09'});
await a.load('');await a.setup('pw1234');await a.checkIn('yosemite');
const b1=await a.exportCloud();

// 1. 首写（TOFU）
{
  const r=await call('POST','/atlas',b1);
  assert.equal(r.status,200,'首写成功');
  assert.ok(store['data/atlas/'+b1.id+'.json'],'已写入仓库路径');
}
// 2. 读回 = 存进去的内容，且 CORS 头在
{
  const r=await call('GET','/atlas?id='+b1.id);
  assert.equal(r.status,200);
  assert.equal(r.headers.get('access-control-allow-origin'),'https://nonnoob.github.io');
  const got=await r.json();
  assert.equal(got.ct,b1.ct);assert.equal(got.pub.x,b1.pub.x);
}
// 3. 同身份更新（再打一卡）
{
  await a.checkIn('zion');
  const b2=await a.exportCloud();
  const r=await call('POST','/atlas',b2);
  assert.equal(r.status,200,'同身份更新成功');
  const got=await(await call('GET','/atlas?id='+b1.id)).json();
  assert.equal(got.ct,b2.ct,'内容已更新');
}
// 4. 异身份同 id → 409
{
  const c=Ledger.create({storage:mem(),today:()=>'2026-07-09'});
  await c.load('');await c.setup('pw1234');
  const bc=await c.exportCloud();
  assert.equal(bc.id,b1.id,'同口令同查找键');
  const r=await call('POST','/atlas',bc);
  assert.equal(r.status,409,'异身份被拒');
}
// 5. 改密文 → 403
{
  const b3=await a.exportCloud();
  const u=Buffer.from(b3.ct,'base64');u[0]^=1;
  const r=await call('POST','/atlas',{...b3,ct:u.toString('base64')});
  assert.equal(r.status,403,'验签失败被拒');
}
// 6. 坏请求
{
  assert.equal((await call('GET','/atlas?id=zz')).status,400,'坏 id');
  assert.equal((await call('POST','/atlas',{id:b1.id})).status,400,'缺字段');
  assert.equal((await call('GET','/nope')).status,404);
  const opt=await call('OPTIONS','/atlas');
  assert.equal(opt.headers.get('access-control-allow-methods'),'GET,POST,OPTIONS');
}

// 7. env 覆盖：fork 者换仓库/目录/来源，默认值不硬锁
{
  const env2={GH_TOKEN:'TEST_TOKEN',GH_REPO:'someone/fork',ARCHIVE_DIR:'saves',ALLOWED_ORIGIN:'https://someone.github.io'};
  const call2=(method,pathq,body)=>worker.fetch(new Request('https://w.test'+pathq,{method,...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})}),env2);
  const b4=await a.exportCloud();
  const r=await call2('POST','/atlas',b4);
  assert.equal(r.status,200,'env 仓库首写成功');
  assert.ok(store['saves/'+b4.id+'.json'],'写进 env 指定目录');
  const g=await call2('GET','/atlas?id='+b4.id);
  assert.equal(g.headers.get('access-control-allow-origin'),'https://someone.github.io','env 来源生效');
}

globalThis.fetch=realFetch;
console.log('cloud-worker.test: all passed');
