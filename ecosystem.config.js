module.exports = {
  apps: [{
    name: "fonte-whatsapp",
    script: "/home/fonte/whatsapp/index.js",
    watch: true,
    ignore_watch: ["node_modules", "logs", ".git"],
    output: '/home/fonte/whatsapp/logs/output.log', // Path for standard output logs
    error: '/home/fonte/whatsapp/logs/error.log', // Path for error logs
    env: {
      PORT: 3001,
      NODE_ENV: "production"
    }
  }]
}
