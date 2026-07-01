// PM2 ecosystem file — version-controls the process definition.
// Start:   pm2 start ecosystem.config.js --env production
// Restart: pm2 restart gethired --update-env
// CRITICAL: entry point is start.js, NOT server.js.
// server.js uses ESM import syntax handled by the 'esm' npm package (v3.2.25).
// Starting server.js directly → ERR_MODULE_NOT_FOUND.
//
// node_args: --max-old-space-size=300  limits V8 heap to 300MB so OOM crashes
// are bounded and predictable rather than consuming all server RAM (961MB total).
// cron_restart: daily 4 AM Manila time (UTC+8 = 20:00 UTC) flushes any slow
// memory leaks that accumulate over days; low-traffic window, zero downtime risk.
module.exports = {
  apps: [{
    name: 'gethired',
    script: './start.js',
    node_args: '--max-old-space-size=300',
    cron_restart: '0 20 * * *',
    env_production: {
      NODE_ENV: 'production',
    },
  }],
};
