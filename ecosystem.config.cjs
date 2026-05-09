module.exports = {
  apps: [
    {
      name: 'novavix-site',
      script: 'npm',
      args: 'run start:standalone',
      cwd: __dirname,
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      max_memory_restart: '700M',
      autorestart: true,
      listen_timeout: 15000,
      kill_timeout: 5000,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 2000,
      time: true
    }
  ]
}
