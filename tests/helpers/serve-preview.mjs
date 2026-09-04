import { preview } from 'astro';

// Keep the server in the foreground so Playwright owns its entire lifetime.
const server = await preview({ server: { host: '127.0.0.1', port: 4537 } });
if (server.port !== 4537) {
  await server.stop();
  throw new Error('Browser test port 4537 is already in use.');
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await server.stop();
    process.exit(0);
  });
}
