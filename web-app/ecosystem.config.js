module.exports = {
  apps: [
    {
      name: "review-prosedur",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3090",
      cwd: "C:\\PENS\\review-prosedur\\web-app",
      env: {
        NODE_ENV: "production"
      }
    },

    // 🔥 TAMBAHAN UNTUK PYTHON
    {
      name: "email-scheduler",
      script: "send_email.py",
      interpreter: "python",
      cwd: "C:\\PENS\\review-prosedur\\web-app",

      autorestart: true,
      restart_delay: 5000,

      out_file: "logs/python-out.log",
      error_file: "logs/python-error.log",

      env: {
        TZ: "Asia/Jakarta"
      }
    }
  ]
};