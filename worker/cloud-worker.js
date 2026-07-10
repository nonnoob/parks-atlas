/* Parks Atlas cloud-archive relay — Cloudflare Worker.
   WHY THIS EXISTS: the app is a static GitHub Pages site with no backend,
   and a GitHub token must never ship in page code (it would leak publicly
   and GitHub would revoke it — see docs/self-hosting.md and docs/adr/0010).
   This Worker holds the token server-side and does two things:
     GET  /atlas?id=…  → read an encrypted archive back by lookup key
     POST /atlas       → verify the bundle's ECDSA signature, then write it
                         into the GitHub repo via the Contents API
   First write pins the bundle's public key (TOFU); later writes must be
   signed by the same key, so nobody can overwrite someone else's atlas.
   Archives are encrypted client-side — this Worker (and the repo) never
   sees which parks anyone visited.

   ── Self-hosting (Cloudflare dashboard, no CLI needed) ──────────────────
   1. Workers & Pages → Create Worker → paste this whole file → Deploy
   2. Worker → Settings → Variables and Secrets:
        Secret  GH_TOKEN  = your GitHub fine-grained PAT
                            (ONLY your atlas repo, Contents: Read and write)
      and override the defaults below as plain-text variables as needed:
        GH_REPO         e.g. 'yourname/parks-atlas'
        GH_BRANCH       default 'main'
        ARCHIVE_DIR     default 'data/atlas'
        ALLOWED_ORIGIN  your Pages origin, e.g. 'https://yourname.github.io'
   3. Put the Worker URL into ATLAS_CONFIG.CLOUD in config.js */

const DEFAULTS = {
  GH_REPO: 'nonnoob/parks-atlas',
  GH_BRANCH: 'main',
  ARCHIVE_DIR: 'data/atlas',
  ALLOWED_ORIGIN: 'https://nonnoob.github.io'
};

export default {
  async fetch(req, env) {
    const REPO = env.GH_REPO || DEFAULTS.GH_REPO;
    const BRANCH = env.GH_BRANCH || DEFAULTS.GH_BRANCH;
    const DIR = env.ARCHIVE_DIR || DEFAULTS.ARCHIVE_DIR;
    const ORIGIN = env.ALLOWED_ORIGIN || DEFAULTS.ALLOWED_ORIGIN;
    const cors = {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'content-type'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    if (url.pathname !== '/atlas') return json({ error: 'not found' }, 404, cors);

    const gh = (path, init) => fetch('https://api.github.com/repos/' + REPO + '/contents/' + path, {
      ...init,
      headers: {
        'authorization': 'Bearer ' + env.GH_TOKEN,
        'user-agent': 'parks-atlas-worker',
        'accept': 'application/vnd.github+json',
        ...(init && init.headers || {})
      }
    });

    if (req.method === 'GET') {
      const id = url.searchParams.get('id') || '';
      if (!/^[0-9a-f]{32}$/.test(id)) return json({ error: 'bad id' }, 400, cors);
      const r = await gh(DIR + '/' + id + '.json?ref=' + BRANCH);
      if (r.status === 404) return json({ error: 'not found' }, 404, cors);
      if (!r.ok) return json({ error: 'upstream ' + r.status }, 502, cors);
      const f = await r.json();
      return new Response(atob(f.content.replace(/\n/g, '')), { headers: { ...cors, 'content-type': 'application/json' } });
    }

    if (req.method === 'POST') {
      let b;
      try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400, cors); }
      if (!b || !/^[0-9a-f]{32}$/.test(b.id || '') || typeof b.ct !== 'string' || b.ct.length > 200000 ||
          !b.pub || typeof b.pub.x !== 'string' || typeof b.pub.y !== 'string' ||
          typeof b.sig !== 'string' || typeof b.salt !== 'string' || typeof b.iv !== 'string')
        return json({ error: 'bad bundle' }, 400, cors);

      const path = DIR + '/' + b.id + '.json';
      const cur = await gh(path + '?ref=' + BRANCH);
      let sha = null, pinnedPub = b.pub;
      if (cur.ok) {
        const f = await cur.json();
        sha = f.sha;
        try { pinnedPub = JSON.parse(atob(f.content.replace(/\n/g, ''))).pub || b.pub; } catch (e) {}
      } else if (cur.status !== 404) return json({ error: 'upstream ' + cur.status }, 502, cors);

      if (pinnedPub.x !== b.pub.x || pinnedPub.y !== b.pub.y) return json({ error: 'pub mismatch' }, 409, cors);
      if (!await verify(pinnedPub, b.sig, b.ct)) return json({ error: 'bad sig' }, 403, cors);

      const stored = JSON.stringify({
        v: 1, id: b.id, fp: String(b.fp || '').slice(0, 16),
        pub: { kty: 'EC', crv: 'P-256', x: b.pub.x, y: b.pub.y },
        salt: b.salt, iv: b.iv, ct: b.ct, sig: b.sig
      });
      const put = await gh(path, {
        method: 'PUT',
        body: JSON.stringify({
          message: 'atlas: ' + (String(b.fp || '').slice(0, 16) || b.id.slice(0, 8)),
          branch: BRANCH, content: btoa(stored), ...(sha ? { sha } : {})
        })
      });
      if (!put.ok) return json({ error: 'save ' + put.status }, 502, cors);
      return json({ ok: true }, 200, cors);
    }
    return json({ error: 'method' }, 405, cors);
  }
};

async function verify(jwk, sigB64, ctB64) {
  try {
    const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y },
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64(sigB64), b64(ctB64));
  } catch (e) { return false; }
}
function b64(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function json(o, status, h) { return new Response(JSON.stringify(o), { status, headers: { ...h, 'content-type': 'application/json' } }); }
