import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run('node', ['./node_modules/typescript/bin/tsc', '-p', 'tsconfig.test.json']);

mkdirSync('.test-build', { recursive: true });
writeFileSync('.test-build/package.json', '{"type":"commonjs"}\n');

const collectTests = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const path = join(dir, entry.name);
  if (entry.isDirectory()) return collectTests(path);
  return entry.name.endsWith('.test.js') ? [path] : [];
});

run('node', ['--test', ...collectTests('.test-build/tests')]);
