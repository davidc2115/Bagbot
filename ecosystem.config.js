module.exports = {
  apps: [
    {
      name: 'bagbot',
      script: './src/bot.js',
      cwd: '/home/bagbot/Bag-bot',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      node_args: '--max-old-space-size=384',
      max_restarts: 5,
      min_uptime: '30s',
      max_restarts_within: '1m',
      restart_delay: 5000,
      exp_backoff_restart_delay: 100,
      error_file: '/home/bagbot/.pm2/logs/bagbot-error.log',
      out_file: '/home/bagbot/.pm2/logs/bagbot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        DISCORD_TOKEN: process.env.DISCORD_TOKEN || 'YOUR_DISCORD_BOT_TOKEN_HERE',
        GUILD_ID: '1360897918504271882',
        FORCE_GUILD_ID: '1360897918504271882',
        CLIENT_ID: '1414216173809307780'
      }
    },
    {
      name: 'dashboard',
      script: './dashboard-v2/server-v2.js',
      cwd: '/home/bagbot/Bag-bot',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      node_args: '--max-old-space-size=128',
      error_file: '/home/bagbot/.pm2/logs/dashboard-error.log',
      out_file: '/home/bagbot/.pm2/logs/dashboard-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        DISCORD_TOKEN: process.env.DISCORD_TOKEN || 'YOUR_DISCORD_BOT_TOKEN_HERE',
        GUILD_ID: '1360897918504271882',
        DASHBOARD_PORT: 46000
      }
    }
  ]
};
