#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

function run(cmd) {
  console.log(`▶ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
}

// 1. Migrations
console.log('Running database migrations...');
run('npx prisma migrate deploy --schema=server/prisma/schema.prisma');

// 2. Seed products
console.log('\nSeeding products...');
run('node server/prisma/seed.js');

// 3. Seed costs
console.log('\nSeeding cost data...');
run('node server/scripts/seed-costs.mjs');

// 4. Seed NPD initiatives
console.log('\nSeeding NPD data...');
run('node server/scripts/seed-npd.mjs');

// 5. Start server (spawn so it takes over the process)
console.log('\nStarting Express server...');
const server = spawn('node', ['server/index.js'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

server.on('close', (code) => process.exit(code));
