/* ============================================================
   Parks Atlas — configuration
   Forking / self-hosting? This is the ONLY frontend file you
   need to edit. See docs/self-hosting.md for the full guide.
   ============================================================ */
window.ATLAS_CONFIG = {

  /* Cloud archive endpoint — YOUR OWN Cloudflare Worker URL.
     The Worker (worker/cloud-worker.js) holds the GitHub token and
     writes encrypted archives into YOUR repo. You MUST deploy your
     own Worker with your own token — this URL only accepts requests
     from its configured origin, so someone else's Worker will not
     work for your fork.
     Set to '' to disable cloud archiving entirely: the app then runs
     fully offline/local (check-ins stay in the browser). */
  CLOUD: 'https://parks-atlas.jacec2096.workers.dev',

  /* Default UI language when the visitor has never chosen one:
     'auto' = follow the browser language; or force 'zh' / 'en'. */
  DEFAULT_LANG: 'auto'
};
