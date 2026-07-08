// PM2 ecosystem config
// Run: npm run deploy (builds frontend + starts with pm2)
// Or:  pm2 start ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'exam-photo',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    restart_delay: 3000,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
