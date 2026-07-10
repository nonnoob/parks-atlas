# Self-hosting guide

This walks you from a fork to a fully working deployment: the game page on GitHub Pages, plus your own cloud-archive backend (a Cloudflare Worker and a GitHub token). Both are free-tier. Budget about ten minutes.

## Why there's a Worker at all

The app is a static site — GitHub Pages has no backend. Cloud archiving needs to write files into a GitHub repo, and the GitHub Contents API needs a token. That token cannot live in the page code:

- the repo is public, so the token would be public;
- GitHub scans public repos for its own tokens and revokes them within minutes;
- and a leaked write token means anyone can write to your repo.

So the token lives in a Cloudflare Worker secret instead, and the page talks to the Worker. The Worker is deliberately tiny (one file, ~100 lines, no dependencies — [`worker/cloud-worker.js`](../worker/cloud-worker.js)) and does exactly two things:

- **GET /atlas?id=…** — fetch an encrypted archive by its lookup key.
- **POST /atlas** — write an archive, but only after checks.

Three properties make this safe to expose publicly:

1. **Archives are encrypted before they leave the browser.** The page encrypts the whole bundle (identity + records) with a key derived from the passphrase. The Worker, the repo, and anyone browsing GitHub see only ciphertext — never which parks were visited.
2. **Writes are signature-gated (TOFU).** Each bundle is ECDSA-signed. On the first write for a lookup key, the Worker pins the bundle's public key; every later write must verify against the pinned key. Without the passphrase you can't produce a valid signature, so you can't overwrite anyone's atlas.
3. **The lookup key derives from the passphrase alone** (PBKDF2 with a fixed salt), so any device with the same passphrase computes the same key — that's how "type your passphrase anywhere and your atlas comes back" works, with no account database anywhere.

If the Worker is down or `CLOUD` is empty, the app degrades gracefully: everything works locally, sync resumes later.

The original design discussion is in [`adr/0010-cloud-archive-via-worker.md`](adr/0010-cloud-archive-via-worker.md) (Chinese).

## Setup

### 1. Fork and enable Pages

1. Fork this repo (say, to `yourname/parks-atlas`).
2. Repo → Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Your site is `https://yourname.github.io/parks-atlas/`.

You may want to empty `data/atlas/` in your fork — those are the upstream deployment's encrypted archives, useless to you.

### 2. Create a fine-grained GitHub token (PAT)

GitHub → Settings → Developer settings → Fine-grained personal access tokens → **Generate new token**:

- **Repository access**: *Only select repositories* → your fork. Nothing else.
- **Permissions**: Repository permissions → **Contents: Read and write**. Nothing else.
- Pick an expiry you can live with (you'll rotate it in the Worker when it expires).

The narrow scope matters: if the token ever leaks, the blast radius is one repo's contents.

### 3. Deploy the Worker

Cloudflare dashboard (free account) → Workers & Pages → **Create Worker**:

1. Paste the whole of [`worker/cloud-worker.js`](../worker/cloud-worker.js), deploy. Name it whatever you like — the name becomes the URL.
2. Worker → Settings → Variables and Secrets:

| Name | Type | Value |
|---|---|---|
| `GH_TOKEN` | **Secret** | the PAT from step 2 |
| `GH_REPO` | Variable | `yourname/parks-atlas` |
| `ALLOWED_ORIGIN` | Variable | `https://yourname.github.io` |

`GH_BRANCH` (default `main`) and `ARCHIVE_DIR` (default `data/atlas`) rarely need changing. Unset variables fall back to the `DEFAULTS` at the top of the Worker file — which point at the upstream deployment, so **set `GH_REPO` and `ALLOWED_ORIGIN` or your archives will go nowhere**.

### 4. Point the page at your Worker

Edit [`config.js`](../config.js):

```js
CLOUD: 'https://your-worker-name.your-subdomain.workers.dev',
```

Commit, push, wait for Pages to rebuild. Done.

### 5. Smoke-test

1. Open your Pages URL, enter a passphrase, confirm "new atlas", scratch a park.
2. Within a couple of seconds your fork should get a commit like `atlas: NP-XXX-XXX` under `data/atlas/`.
3. Open the site in a private window, enter the same passphrase — the check-in should come back.

If step 2 never happens, open the browser console and the Worker's live logs (Worker → Logs) — the usual culprits are a wrong `ALLOWED_ORIGIN` (CORS error in console) or a token without Contents write permission (Worker returns 502).

## Customizing

- **Language**: `DEFAULT_LANG` in `config.js` (`'auto' | 'zh' | 'en'`); visitors can switch anytime with the 🌐 button.
- **Parks/content**: all in `data.js`. Keep each park's `id` stable (records reference it) and keep badge emoji unique across the set.
- **UI strings**: `i18n.js`.
- **Before touching storage/sync formats**: read [`invariants.md`](invariants.md).
