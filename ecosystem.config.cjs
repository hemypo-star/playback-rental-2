
module.exports = {
  apps: [
    {
      name: 'playback-rental-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: '8080'
      }
    },
    {
      name: 'playback-rental-server',
      script: 'server/index.js',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: '3001'
      }
    }
  ]
};
