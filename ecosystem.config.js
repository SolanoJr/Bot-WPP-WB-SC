module.exports = {
  apps: [{
    name: 'bot-wpp',
    script: './index.js',
    cwd: '/home/solanojr/bot-wpp',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
