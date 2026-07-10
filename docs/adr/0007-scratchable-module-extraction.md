# 刮开手势抽出为独立 Scratchable 模块（scratchable.js）

app-parks.js 的 initScratch 约 35 行内联了涂层绘制、长按解锁状态机、采样节流、双指防误刮与业务（签名确认、callout、音效）。决定（2026-07-07）：手势/涂层/多指追踪抽出为 `scratchable.js`（`window.Scratchable.attach(canvas, opts)` + `circlePath(size)`），业务经回调注入，模块零业务、零音频实现。前置 script 标签模式，同 ADR-0006，不违反无构建约束（ADR-0005）。

接口：`attach(cv,{clip,disabled,confirm,onReveal,onTap,onProgress,fx})`。`confirm()` 为异步守门（返回 false 恢复涂层）；`onProgress(k)` 承接底图滤镜过渡（0 恢复 / 1 完成）；`fx={ensureAudio,scratch,ding,buzz}` 全部可省。测试注入：`dpr` / `isMultiTouch()` / `now()`。

**行为常量与线上一致且不可轻改：ARM_MS=350（长按解锁）、TH=1（容差 1 格）、70ms 采样节拍、MOVECANCEL=8。**触觉模式（armed 18ms / 刮 6ms / 完成 [28,40,80]）属于手势手感，留在模块内。

## Considered Options

- 只抽 countFoil/circlePath 纯函数 —— 浅模块，状态机仍散在调用方，被否。
- 模块内做 ensurePriv/showCallout —— 业务与 DOM 进模块、Node 没法测，被否。

## Consequences

Node 可测：`node tests/scratchable.test.mjs`（7 组：circlePath/采样/全流程/confirm 拒绝恢复/轻点/滑动取消/双指，假 canvas+可控 alpha）。parks.html 加载顺序：scratchable.js 在 app-parks.js 之前。改手势手感先跑测试再真机（iframe 390px 合成 PointerEvent）回归。
