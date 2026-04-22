export default {
  apps: [
    {
      name: 'review360-prod',
      script: 'src/server.js',
      cwd: '/home/cleancom/apps/review360-backend',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      log_file: '/home/cleancom/logs/backend-prod.log',
      error_file: '/home/cleancom/logs/pm2-error.log',
      time: true,
    },
    {
      name: 'review360-staging',
      script: 'src/server.js',
      cwd: '/home/cleancom/apps/review360-backend-staging',
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3002,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      log_file: '/home/cleancom/logs/backend-staging.log',
      time: true,
    },
  ],
};
