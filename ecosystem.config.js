module.exports = {
  apps: [
    {
      name: "bagbot",
      script: "./src/bot.js",
      cwd: "/home/bagbot/Bag-bot",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      // Plus de marge mémoire (évite crash GC/OOM sur grosses configs)
      // ⚠️ À ajuster selon la RAM du serveur
      max_memory_restart: "900M",
      node_args: "--max-old-space-size=768",
      max_restarts: 10,
      min_uptime: "30s",
      restart_delay: 3000,
      error_file: "/home/bagbot/.pm2/logs/bagbot-error.log",
      out_file: "/home/bagbot/.pm2/logs/bagbot-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    },
    {
      name: "bot-api",
      script: "./src/api-server.js",
      cwd: "/home/bagbot/Bag-bot",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "350M",
      node_args: "--max-old-space-size=320",
      error_file: "/home/bagbot/.pm2/logs/bot-api-error.log",
      out_file: "/home/bagbot/.pm2/logs/bot-api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    },
    {
      name: "dashboard",
      script: "./dashboard-v2/server-v2.js",
      cwd: "/home/bagbot/Bag-bot",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "150M",
      node_args: "--max-old-space-size=128",
      error_file: "/home/bagbot/.pm2/logs/dashboard-error.log",
      out_file: "/home/bagbot/.pm2/logs/dashboard-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    }
  ]
};
