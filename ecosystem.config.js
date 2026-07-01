// PM2 ecosystem file — version-controls the process definition.
// Start:   pm2 start ecosystem.config.js --env production
// Restart: pm2 restart gethired --update-env
// CRITICAL: entry point is start.js, NOT server.js.
// server.js uses ESM import syntax handled by the 'esm' npm package (v3.2.25).
// Starting server.js directly → ERR_MODULE_NOT_FOUND.
//
// instances: 2 — cluster mode across 2 vCPUs (Linode 4 GB has 2 vCPUs).
//   Each worker gets its own V8 heap; PM2 load-balances incoming requests.
//   Do NOT increase beyond 2 — server has exactly 2 vCPUs.
// node_args: --max-old-space-size=700  each worker capped at 700 MB.
//   2 workers × 700 MB = 1,400 MB max heap, well within 4 GB total RAM.
//   (Previously 300 MB on the old 1 GB Nanode.)
// cron_restart: daily 4 AM Manila time (UTC+8 = 20:00 UTC).
module.exports = {
  apps: [{
    name: 'gethired',
    script: './start.js',
    instances: 2,
    exec_mode: 'cluster',
    node_args: '--max-old-space-size=700',
    cron_restart: '0 20 * * *',
    env_production: {
      NODE_ENV: 'production',
    },
  }],
};
