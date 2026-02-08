/**
 * PM2 Ecosystem Configuration
 *
 * Usage:
 *   npm install -g pm2
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup   # Auto-start on boot
 */

module.exports = {
  apps: [
    {
      name: 'flutur-telegram-bot',
      script: 'npx',
      args: 'tsx src/telegram-bot.ts',
      cwd: '/Users/alessioivoycazzaniga/Projects/social-cli-mcp',

      // Restart on crash
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,

      // Memory management
      max_memory_restart: '500M',

      // Logging
      log_file: './logs/telegram-bot.log',
      error_file: './logs/telegram-bot-error.log',
      out_file: './logs/telegram-bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Environment
      env: {
        NODE_ENV: 'production',
      },

      // Watch (disable in production)
      watch: false,
    }
  ]
};
