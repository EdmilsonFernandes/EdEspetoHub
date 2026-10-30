// Passo 6b: injeta o payload no container backend do EC2 via docker exec (stdin).
// Uso: node upload-store.mjs <payload.js> [--key CAMINHO] [--host HOST]
// Override por env: JNC_SSH_KEY / JNC_SSH_HOST
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const payloadPath = args[0];
if (!payloadPath || !fs.existsSync(payloadPath)) {
  console.error('uso: node upload-store.mjs <payload.js> [--key CAMINHO] [--host HOST]');
  process.exit(1);
}
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const KEY = flag('--key') || process.env.JNC_SSH_KEY || 'D:/PESSOAL/PESSOAL/chamanoespeto-aws/medtrack-system.pem';
const HOST = flag('--host') || process.env.JNC_SSH_HOST || 'ec2-user@ec2-3-137-119-152.us-east-2.compute.amazonaws.com';

console.log(`Injetando ${path.basename(payloadPath)} (${Math.round(fs.statSync(payloadPath).size / 1024)}KB) em ${HOST}...`);
const res = spawnSync('ssh', [
  '-i', KEY, '-o', 'ConnectTimeout=15', HOST,
  'docker exec -i janocaminho-backend node -',
], { stdio: ['pipe', 'inherit', 'inherit'], input: fs.readFileSync(payloadPath) });
process.exit(res.status ?? 1);
