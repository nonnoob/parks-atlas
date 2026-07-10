# Frozen compatibility surface

Existing atlases — in browsers' localStorage, in shared links people have sent around, and in encrypted archives already committed to repos — depend on the formats below. Changing any of them silently bricks real data. If you must evolve one, version it and keep reading the old form forever.

| Surface | Where | What's frozen |
|---|---|---|
| Local storage slot | `ledger.js` / `app.js` | Key `np_v1:<cloudId>` (legacy single slot `np_v1` still migrated on entry); value shape `{idn:{salt,iv,enc,pub,fp}, recs:{<parkId>:{d,n,s}}}` |
| Check-in signature | `ledger.js` | ECDSA P-256 / SHA-256 over the UTF-8 string `id|date|note` |
| Key derivation | `ledger.js` | PBKDF2-SHA-256, 150000 iterations; AES key salt is per-identity random; **cloud lookup key uses the fixed salt `np-cloud-v1`**, output 128 bits, hex-encoded |
| Share link | `ledger.js` | `#share=` + base64url of `{v:1,pub,fp,recs}` (verified records only) |
| Cloud bundle | `ledger.js` / `worker/cloud-worker.js` | `{v:1,id,fp,pub:{kty,crv,x,y},salt,iv,ct,sig}`; `ct` = AES-GCM over `{idn,recs}`; `sig` = ECDSA over the raw ciphertext bytes |
| Worker API | `worker/cloud-worker.js` | `GET /atlas?id=<32 hex>` → bundle JSON; `POST /atlas` with bundle → 200/400/403/409 semantics (409 = public-key mismatch with the pinned first writer) |
| Park ids | `data.js` | `recs` and archives reference parks by `id` — never rename or reuse one |

Tests in `tests/` pin much of this behavior. Run all three after any change to `ledger.js`, `scratchable.js`, or the Worker:

```
node tests/ledger.test.mjs && node tests/scratchable.test.mjs && node tests/cloud-worker.test.mjs
```
