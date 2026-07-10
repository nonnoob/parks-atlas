# Parks Atlas · 公园图鉴

A scratch-off collection game for the 63 U.S. National Parks. Pick a state on the map, press and hold a park badge, scratch off the foil, and the park lights up in your atlas — like scratching a lottery ticket, except the prize is remembering where you've been.

美国 63 座国家公园的刮刮卡收集游戏。在地图上点进一个州，长按公园徽章、刮开箔层，这座公园就在你的图鉴里点亮了。

**Play: https://nonnoob.github.io/parks-atlas/**

## How it works · 玩法

- Open the page, enter a passphrase. **The passphrase IS the atlas**: the same passphrase opens the same atlas on any device; a new passphrase starts a new atlas (after confirmation). No accounts, no sign-up.
- Tap a state, hold a badge for half a second, scratch. Pick the visit date (today by default, or backfill an earlier trip).
- "Share" gives friends a read-only snapshot link. They can view and verify it, but not change it.
- Works offline once loaded. Check-ins are archived to the cloud automatically when online.

- 打开网页输入口令。**口令即图鉴**：任何设备同一口令进同一本；新口令确认后开新本。没有账号、无需注册。
- 点一个州，长按徽章半秒后刮开，选定到访日期（默认当天，可补记往日）。
- 「分享」生成只读快照链接，朋友可看、可验真、改不了。
- 加载过一次即可离线使用；联网时打卡自动云存档。

## Why check-ins can't be faked · 打卡为什么改不了

Every check-in is signed with an ECDSA key that only unlocks with your passphrase. Tampered records fail verification and show up flagged in red on shared snapshots. The cloud archive is encrypted client-side before upload — the storage repo never learns which parks you visited, and nobody without your passphrase can overwrite it.

每条打卡记录都由口令解锁的 ECDSA 私钥签名，被改动的记录验签必失败，在分享快照里标红揭穿。云存档在浏览器里先加密再上传，仓库里看不出你去过哪里，无口令者也覆盖不掉。

## Self-hosting / forking · 自建

> **⚠️ You must deploy your own Cloudflare Worker and GitHub token.**
> The cloud archive writes to a GitHub repo through a tiny Worker that holds a fine-grained PAT. That Worker belongs to this deployment and only answers its own origin — a fork pointing at it will not work. Setting it up takes about ten minutes and is free: see **[docs/self-hosting.md](docs/self-hosting.md)**.
>
> **⚠️ Fork 必须自建 Cloudflare Worker + 自己的 GitHub token。** 云存档经一个持有 fine-grained PAT 的小 Worker 写入 GitHub 仓库；这个 Worker 只服务本站来源，fork 直接指过来是不通的。自建约十分钟、全免费，步骤见 **[docs/self-hosting.md](docs/self-hosting.md)**。

All frontend knobs live in [`config.js`](config.js). Don't want cloud archiving at all? Set `CLOUD: ''` and the app runs fully local.

前端配置集中在 [`config.js`](config.js)。不想要云存档？`CLOUD` 置空即可，应用纯本地运行。

## Development · 开发

No build step — plain HTML/JS served as-is (d3 and topojson are vendored). Serve locally and open:

```
python3 -m http.server 8000
```

Tests run on plain Node (v18+):

```
node tests/ledger.test.mjs
node tests/scratchable.test.mjs
node tests/cloud-worker.test.mjs
```

| File | What it is |
|---|---|
| `index.html` | Page, styles, script loading |
| `config.js` | **Deployment config — the only file a fork edits** |
| `data.js` | The 63 parks (bilingual), states, regions, tiers |
| `i18n.js` | UI string table, `t()`, language switching |
| `app.js` | Map views, scratch flow, cloud sync, share |
| `ledger.js` | Signed check-in ledger (crypto core) |
| `scratchable.js` | Scratch gesture module |
| `worker/cloud-worker.js` | Cloudflare Worker: cloud-archive relay |
| `data/atlas/` | Encrypted cloud archives (opaque blobs) |

Before changing storage or sync code, read **[docs/invariants.md](docs/invariants.md)** — several formats are frozen because existing atlases depend on them. Design history lives in `docs/adr/` (in Chinese; summaries in the docs).

改存储或同步代码前先读 **[docs/invariants.md](docs/invariants.md)**：若干格式已冻结，老图鉴依赖它们。设计沿革见 `docs/adr/`（中文）。

## License

MIT
