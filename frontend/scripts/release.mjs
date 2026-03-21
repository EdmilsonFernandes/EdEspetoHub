import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VALID_BUMPS = new Set(['patch', 'minor', 'major']);
const bump = String(process.argv[2] || '').toLowerCase();

if (!VALID_BUMPS.has(bump)) {
  console.error('Uso: node scripts/release.mjs <patch|minor|major>');
  process.exit(1);
}

const cwd = resolve(process.cwd());
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const run = (bin, args, options = {}) => {
  return execFileSync(bin, args, {
    cwd,
    stdio: 'pipe',
    ...options,
  })
    .toString()
    .trim();
};

const runInherit = (bin, args) => {
  execFileSync(bin, args, {
    cwd,
    stdio: 'inherit',
  });
};

const gitStatus = run('git', ['status', '--porcelain']);
if (gitStatus) {
  console.error('Repositório com alterações pendentes. Faça commit/stash antes do release.');
  process.exit(1);
}

runInherit(npmBin, ['version', bump, '--no-git-tag-version']);
runInherit('node', ['scripts/generate-build-info.mjs']);

const pkg = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8'));
const version = String(pkg?.version || '').trim();
if (!version) {
  console.error('Versão inválida após bump.');
  process.exit(1);
}

runInherit('git', ['add', 'package.json', 'package-lock.json', 'src/generated/buildInfo.ts']);
runInherit('git', ['commit', '-m', `chore(release): v${version}`]);
const shortHash = run('git', ['rev-parse', '--short', 'HEAD']);
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);

runInherit('git', ['tag', `v${version}`]);
runInherit('git', ['push']);
runInherit('git', ['push', '--tags']);

console.log(`Release concluído: v${version} (${shortHash}) [${branch}]`);
