module.exports = {
  apps: [{
    name: 'intelligent-kitchen-api',
    script: 'src/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    log_file: './logs/api-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }, {
    name: 'database-health-monitor',
    script: 'health-monitor.js',
    args: 'start 1',
    instances: 1,
    exec_mode: 'fork',
    error_file: './logs/health-monitor-error.log',
    out_file: './logs/health-monitor-out.log',
    log_file: './logs/health-monitor-combined.log',
    time: true
  }]
};
