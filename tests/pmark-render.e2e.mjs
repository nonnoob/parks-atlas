/* 全美视图公园标记渲染回归（#5）：未打卡=灰、已点亮=彩，WebKit + Chromium 双引擎。
   背景：WebKit 对 SVG 子元素忽略 CSS filter 函数（grayscale/drop-shadow），
   修复用 SVG 滤镜引用 url(#pmark-gray/#pmark-glow)，本测试锁死该行为。

   非默认测试集（需浏览器引擎）。运行：
     npm i playwright pngjs && npx playwright install webkit chromium-headless-shell
     node tests/pmark-render.e2e.mjs
   注意：必须用 page.screenshot({clip}) 而非 element.screenshot() —— 后者对
   SVG <text> 在 WebKit 上截错区域。 */
import {webkit, chromium} from 'playwright';
import {PNG} from 'pngjs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8643;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', root], {stdio: 'ignore'});
await new Promise(r => setTimeout(r, 800));

async function check(engineName, engine) {
  const browser = await engine.launch();
  const page = await browser.newPage({viewport: {width: 1200, height: 800}});
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForSelector('.pmark', {timeout: 10000});
  const cancel = page.locator('#gc');
  if (await cancel.count()) await cancel.click();
  await page.waitForTimeout(400);
  // 测量掩膜：背景涂黑，只统计 emoji 像素
  await page.addStyleTag({content:
    '.state{fill:#000!important}.ab{display:none!important}' +
    '.mapwrap{background:#000!important}#mapHost svg rect{fill:#000!important;stroke:#000!important}' +
    '#mapHost svg text[fill]{fill:#000!important}'});
  await page.waitForTimeout(200);

  const spreadAt = async (bbox) => {
    const png = PNG.sync.read(await page.screenshot({clip: bbox}));
    let s = 0, c = 0;
    for (let p = 0; p < png.data.length; p += 4) {
      const [r, g, b, a] = png.data.slice(p, p + 4);
      if (a < 200) continue;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx < 40) continue;
      s += mx - mn; c++;
    }
    return c ? s / c : 0;
  };
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('.pmark:not(.lit)')].map(m => {
      const r = m.getBoundingClientRect();
      return {x: r.x, y: r.y, width: r.width, height: r.height};
    }).filter(b => b.width > 2 && b.height > 2 && b.x >= 0 && b.y >= 0 &&
                   b.x + b.width <= innerWidth && b.y + b.height <= innerHeight)
      .slice(0, 8));
  let worst = 0;
  for (const bb of boxes) worst = Math.max(worst, await spreadAt(bb));

  const litBox = await page.evaluate(() => {
    const m = document.querySelector('.pmark');
    m.classList.add('lit');
    const r = m.getBoundingClientRect();
    return {x: r.x, y: r.y, width: r.width, height: r.height};
  });
  await page.waitForTimeout(400);
  const lit = await spreadAt(litBox);
  await browser.close();

  if (worst >= 12) throw new Error(`${engineName}: unlit markers colored (spread ${worst.toFixed(1)}, need <12)`);
  if (lit < 12) throw new Error(`${engineName}: lit marker lost color (spread ${lit.toFixed(1)}, need >=12)`);
  console.log(`${engineName}: unlit worst=${worst.toFixed(1)} lit=${lit.toFixed(1)} ok`);
}

try {
  await check('webkit', webkit);
  await check('chromium', chromium);
  console.log('pmark-render.e2e: all passed');
} finally {
  server.kill();
}
