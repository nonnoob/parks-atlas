# Architecture decision records

These ADRs document why the app is built the way it is. They were written in Chinese in the parent project this app was extracted from, and are kept verbatim as the historical record — the English docs ([`../self-hosting.md`](../self-hosting.md), [`../invariants.md`](../invariants.md)) summarize everything a fork needs.

- **0009** — offline-first service worker (stale-while-revalidate, precache)
- **0010** — cloud archive: encrypted bundles in a GitHub repo, written via a Cloudflare Worker holding the token; TOFU signature pinning
- **0011** — badges are unique emoji medallions (real-boundary outlines dropped)
- **0012** — the passphrase IS the atlas: multiple passphrases per device, invalid-record self-healing on the owner's side
