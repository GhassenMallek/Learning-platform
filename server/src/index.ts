import { createApp } from './app';
import { env } from './config/env';
import { connectDb, databaseName, disconnectDb } from './db';

async function main() {
  await connectDb();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`API ready → http://localhost:${env.PORT}/api  (database: ${databaseName()}, env: ${env.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start the API:', err instanceof Error ? err.message : err);
  process.exit(1);
});
