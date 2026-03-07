module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || 'jmms-backend',
      cwd: process.env.JMMS_BACKEND_CWD || '/opt/jmms/backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.BACKEND_PORT || '4000',
      },
    },
  ],
}
