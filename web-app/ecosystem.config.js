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
    }
  ]
};