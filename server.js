const http = require("http");
const { createApp } = require("./src/app");
const { connectDatabase } = require("./src/config/database");
const { env } = require("./src/config/env");
const { attachSocketServer } = require("./src/sockets");

async function bootstrap() {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  attachSocketServer(server);

  server.listen(env.PORT, () => {
    console.log(`FormFlow backend listening on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start FormFlow backend", error);
  process.exit(1);
});
