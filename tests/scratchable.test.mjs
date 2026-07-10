/* Scratchable 模块测试：node tests/scratchable.test.mjs
   覆盖：circlePath、countFoil 采样、长按解锁→刮开→confirm→onReveal 全流程、
   confirm 拒绝恢复涂层、轻点 onTap、未长按滑动不刮、双指防误刮 */
import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const src=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'..','scratchable.js'),'utf8');
(0,eval)(src);
const S=globalThis.Scratchable;
assert.ok(S&&S.attach&&S.circlePath,'Scratchable 接口存在');

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- 假 canvas / ctx：getImageData 返回可控 alpha 缓冲 ---------- */
function fakeCanvas(size){
  const listeners={};
  const ctx={
    _alpha:255, // getImageData 统一返回的 alpha（测试直接改这个值模拟刮开程度）
    scale(){},save(){},restore(){},clip(){},fillRect(){},beginPath(){},arc(){},fill(){},
    moveTo(){},lineTo(){},stroke(){},clearRect(){},
    createLinearGradient(){return{addColorStop(){}};},
    getImageData(x,y,w,h){const d=new Uint8ClampedArray(w*h*4);for(let i=3;i<d.length;i+=4)d[i]=ctx._alpha;return {data:d};}
  };
  const cv={
    width:0,height:0,style:{},
    _cls:new Set(),
    classList:{add(c){cv._cls.add(c);},remove(c){cv._cls.delete(c);},contains(c){return cv._cls.has(c);}},
    getBoundingClientRect(){return {left:0,top:0,width:size,height:size};},
    getContext(){return ctx;},
    setPointerCapture(){},releasePointerCapture(){},
    addEventListener(t,fn){listeners[t]=fn;},
    remove(){cv._removed=true;},
    fire(t,e){if(listeners[t])listeners[t](Object.assign({pointerId:1,pointerType:'touch',clientX:0,clientY:0,preventDefault(){}},e));}
  };
  return {cv,ctx};
}

// 1. circlePath 几何
{
  const d=S.circlePath(84);
  assert.equal(d,'M 42 1 a 41 41 0 1 0 0 82 a 41 41 0 1 0 0 -82 Z');
}

// 2. countFoil：全覆盖 vs 全刮开
{
  const {cv,ctx}=fakeCanvas(90);
  cv.width=90;cv.height=90;
  ctx._alpha=255;
  const full=S._countFoil(ctx,cv);
  assert.ok(full>=18*18*0.9,'全覆盖时采样数接近 18x18，实得 '+full);
  ctx._alpha=0;
  assert.equal(S._countFoil(ctx,cv),0,'全透明时为 0');
}

// 3. 全流程：长按解锁 → 刮 → 阈值 → confirm → onReveal（含进度回调）
{
  const {cv,ctx}=fakeCanvas(100);
  const got={progress:[],reveal:0,tap:0,confirm:0};
  S.attach(cv,{
    isMultiTouch:()=>false,dpr:1,
    confirm:async()=>{got.confirm++;return true;},
    onReveal:()=>{got.reveal++;},
    onTap:()=>{got.tap++;},
    onProgress:k=>{got.progress.push(k);}
  });
  await sleep(40); // attach 内 20ms 初始化
  cv.fire('pointerdown',{clientX:50,clientY:50});
  await sleep(400); // ARM_MS=350 长按解锁
  assert.ok(cv.classList.contains('armed'),'长按后进入 armed');
  ctx._alpha=0; // 模拟涂层已被刮光
  cv.fire('pointermove',{clientX:60,clientY:60}); // 首拍即采样（lastSfx=0）
  await sleep(10);
  assert.equal(got.confirm,1,'阈值达成后 confirm 调用一次');
  assert.equal(got.reveal,1,'onReveal 触发');
  assert.equal(got.progress[got.progress.length-1],1,'最终进度 1');
  assert.equal(cv.style.opacity,'0','画布淡出');
  assert.equal(got.tap,0,'刮开不算轻点');
}

// 4. confirm 拒绝 → 恢复涂层（进度回 0，可再刮）
{
  const {cv,ctx}=fakeCanvas(100);
  const got={progress:[],reveal:0};
  S.attach(cv,{
    isMultiTouch:()=>false,dpr:1,
    confirm:async()=>false,
    onReveal:()=>{got.reveal++;},
    onProgress:k=>{got.progress.push(k);}
  });
  await sleep(40);
  cv.fire('pointerdown',{clientX:50,clientY:50});
  await sleep(400);
  ctx._alpha=0;
  cv.fire('pointermove',{clientX:60,clientY:60});
  await sleep(10);
  assert.equal(got.reveal,0,'confirm=false 不 reveal');
  assert.equal(got.progress[got.progress.length-1],0,'涂层恢复，进度回 0');
  assert.ok(!cv.classList.contains('armed'),'armed 已清');
}

// 5. 轻点（未长按、未移动）→ onTap；disabled 时仍可轻点
{
  for(const disabled of [false,true]){
    const {cv}=fakeCanvas(100);
    const got={tap:0,reveal:0};
    S.attach(cv,{isMultiTouch:()=>false,dpr:1,disabled:()=>disabled,onTap:()=>{got.tap++;},onReveal:()=>{got.reveal++;}});
    await sleep(40);
    cv.fire('pointerdown',{clientX:50,clientY:50});
    await sleep(30); // 远小于 ARM_MS
    cv.fire('pointerup',{});
    assert.equal(got.tap,1,'轻点触发 onTap (disabled='+disabled+')');
    assert.equal(got.reveal,0);
  }
}

// 6. 未长按就滑动 = 取消长按，不刮不 tap
{
  const {cv,ctx}=fakeCanvas(100);
  const got={tap:0,reveal:0,confirm:0};
  S.attach(cv,{isMultiTouch:()=>false,dpr:1,confirm:async()=>{got.confirm++;return true;},onTap:()=>{got.tap++;},onReveal:()=>{got.reveal++;}});
  await sleep(40);
  cv.fire('pointerdown',{clientX:10,clientY:10});
  cv.fire('pointermove',{clientX:60,clientY:60}); // 移动 >MOVECANCEL，取消长按
  await sleep(400);
  assert.ok(!cv.classList.contains('armed'),'移动后不再进入 armed');
  ctx._alpha=0;
  cv.fire('pointermove',{clientX:80,clientY:80});
  await sleep(10);
  assert.equal(got.confirm,0,'未解锁不采样不判定');
  cv.fire('pointerup',{});
  assert.equal(got.tap,0,'大幅滑动不算轻点');
  assert.equal(got.reveal,0);
}

// 7. 双指 = 缩放：不解锁、不刮
{
  const {cv,ctx}=fakeCanvas(100);
  const got={reveal:0,tap:0};
  S.attach(cv,{isMultiTouch:()=>true,dpr:1,onReveal:()=>{got.reveal++;},onTap:()=>{got.tap++;}});
  await sleep(40);
  cv.fire('pointerdown',{clientX:50,clientY:50});
  await sleep(400);
  assert.ok(!cv.classList.contains('armed'),'双指按住不解锁');
  ctx._alpha=0;
  cv.fire('pointermove',{clientX:60,clientY:60});
  await sleep(10);
  assert.equal(got.reveal,0,'双指移动不刮');
  cv.fire('pointerup',{});
  assert.equal(got.tap,0,'双指抬起不算轻点');
}

console.log('scratchable.test: all passed');
