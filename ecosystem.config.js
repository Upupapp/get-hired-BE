// PM2 ecosystem file — version-controls the process definition.
// Start:   pm2 start ecosystem.config.js
// Restart: pm2 restart gethired --update-env
// CRITICAL: entry point is start.js, NOT server.js.
// server.js uses ESM import syntax handled by the 'esm' npm package (v3.2.25).
// Starting server.js directly → ERR_MODULE_NOT_FOUND.
module.exports = {
  apps: [{
    name: 'gethired',
    script: './start.js',
    env_production: {
      NODE_ENV: 'production',
    },
  }],
};
