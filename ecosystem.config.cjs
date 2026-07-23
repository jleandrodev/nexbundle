// PM2 — processo do backend Remix (painel admin + App Proxy) em produção.
// As variáveis de ambiente vêm de .env.production (o deploy.sh faz `source` e
// passa --update-env). Rode `pm2 save` após o primeiro start p/ sobreviver a reboot.
module.exports = {
  apps: [
    {
      name: "buy-together",
      script: "./node_modules/@remix-run/serve/dist/cli.js",
      args: "./build/server/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3000",
      },
      max_memory_restart: "400M",
      // Logs (ajuste o caminho se quiser centralizar):
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
