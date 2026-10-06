const path = require('path');

module.exports = {
  apps: [
    {
      name: "review-prosedur",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3090",
      cwd: path.resolve(__dirname),
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      max_memory_restart: '1G',
      out_file: "logs/next-out.log",
      error_file: "logs/next-error.log",
      env: {
        NODE_ENV: "production",
        PORT: 3090
      }
    },
    {
      name: "email-scheduler",
      script: "send_email.py",
      interpreter: "python",
      cwd: path.resolve(__dirname),
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      out_file: "logs/python-out.log",
      error_file: "logs/python-error.log",
      env: {
        TZ: "Asia/Jakarta"
      }
    }
  ]
};