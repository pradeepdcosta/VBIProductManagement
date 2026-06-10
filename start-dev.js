import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);
process.env.API_PORT = '3002';

const { default: concurrently } = await import('concurrently');

concurrently([
  { command: 'node --watch server/index.js', name: 'API', prefixColor: 'cyan' },
  { command: 'node node_modules/vite/bin/vite.js --port 5173 --host 127.0.0.1 --config client/vite.config.js client', name: 'UI', prefixColor: 'magenta' },
]);
