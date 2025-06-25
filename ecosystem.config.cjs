
module.exports = {
  apps: [
    {
      name: 'playback-rental-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: '8080',
        SUPABASE_URL: 'http://84.201.170.203:8000',
        API_URL: 'http://84.201.170.203:3001/api'
      }
    },
    {
      name: 'playback-rental-server',
      script: 'server/index.js',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        SUPABASE_URL: 'http://84.201.170.203:8000',
        API_URL: 'http://84.201.170.203:3001/api'
      }
    }
  ]
};
