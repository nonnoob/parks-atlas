# 签名打卡逻辑抽出为独立 Ledger 模块（ledger.js）

app-parks.js 原为单 IIFE，WebCrypto 签名/验签/存储/分享编码约 90 行散布在 6 个调用点。决定（2026-07-02）：抽出为 `ledger.js`（`window.Ledger.create({storage,subtle,today})`），与 park-bounds.js 同为前置 script 标签模式，不违反无构建约束（ADR-0005）。

接口：`load(hash)` / `setup(pass)` / `unlock(pass)` / `lock()` / `checkIn(id)` / `remove(id)` / `isVisited` / `isTamper` / `record(id)` / `shareFragment()` + `readonly/hasIdentity/unlocked/fp/supported`。UI（modal/toast）留在 app-parks.js，模块零 DOM。storage 以 adapter 注入（浏览器 localStorage / 测试内存实现）。

**硬约束：`np_v1` localStorage 格式与 `#share=` 编码字节级不变**——老用户数据与已发出的分享链接依赖它。

## Considered Options

- 只抽 crypto 原语、状态仍留全局 —— 浅模块（接口≈实现，调用方仍要管 VALID/recs），被否。
- 模块含 UI（自带口令弹窗）—— DOM 进模块、没法 Node 测试，被否。

## Consequences

Node 可测：`node tests/ledger.test.mjs`（5 组：格式兼容/错口令/篡改/分享往返/删除，本地文件不部署）。app-parks.js 改动 ledger 逻辑时先跑测试；parks.html 需在 app-parks.js 之前加载 ledger.js。
