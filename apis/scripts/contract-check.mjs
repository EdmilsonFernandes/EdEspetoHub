// Contract check: toda rota chamada pelo frontend (apiClient.*) precisa existir na whitelist do BFF proxy.
// Origem: auditoria consiliar 17/08 — feature de cupom morreu em produção porque a whitelist manual
// do proxy nunca recebeu as rotas (backend + frontend commitados, BFF esquecido, zero testes no apis).
// Uso: node scripts/contract-check.mjs  (exit 1 se houver rota faltando)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROXY_FILE = join(ROOT, 'apis', 'src', 'domains', 'proxy', 'proxy.routes.ts');
const FRONTEND_SRC = join(ROOT, 'frontend', 'src');

// ---- 1. Rotas registradas no proxy BFF ----
const proxySrc = readFileSync(PROXY_FILE, 'utf8');
const proxyRoutes = new Set();
const proxyRe = /r\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
for (const m of proxySrc.matchAll(proxyRe)) {
  proxyRoutes.add(`${m[1].toUpperCase()} ${normalize(m[2])}`);
}
// Rotas dedicadas do BFF (fora do proxy) também contam como atendidas:
// auth, customer, orders têm routers próprios em /api|/v1 —registradas como prefixo.
const dedicatedPrefixes = ['/auth', '/customer', '/orders'];

function normalize(path) {
  return path
    .replace(/:([A-Za-z0-9_]+)/g, '*')
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '') || '/';
}
function normalizeCall(path) {
  // `/stores/${id}/coupons` → `/stores/*/coupons` (interpolação = segmento de path)
  // `.../products${suffix}` / `...${query}` → truncar (sufixo query, não segmento)
  let out = '';
  let i = 0;
  while (i < path.length) {
    const start = path.indexOf('${', i);
    if (start === -1) { out += path.slice(i); break; }
    const end = path.indexOf('}', start);
    if (end === -1) { out += path.slice(i); break; }
    const before = start > 0 ? path[start - 1] : '';
    const after = end + 1 < path.length ? path[end + 1] : '';
    if (before === '/' && (after === '/' || end + 1 === path.length)) {
      out += path.slice(i, start) + '*';
      i = end + 1;
    } else {
      // sufixo colado (query/suffix) — descarta o resto
      out += path.slice(i, start);
      break;
    }
  }
  return normalize(out);
}

function callMatchesProxy(method, normPath) {
  if (proxyRoutes.has(`${method} ${normPath}`)) return true;
  if (dedicatedPrefixes.some((p) => normPath === p || normPath.startsWith(p + '/'))) return true;
  // tolerância: método qualquer na mesma rota (alguns forwards usam GET genérico p/ variantes)
  return false;
}

// ---- 2. Chamadas do frontend ----
function walk(dir, acc) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}
// Chamadas que o frontend faz mas o endpoint NÃO EXISTE nem no backend (bugs latentes,
// capturados pelo contrato em 17/08). Allowlist explícita com motivo — o objetivo é zerar.
const KNOWN_DEAD_CALLS = new Set([
  'GET /customers',
]);

const files = walk(FRONTEND_SRC, []);
const callRe = /apiClient\s*\.\s*(get|post|put|patch|delete)\s*\(\s*([`'"])([^`'"]+)\2/g;
const missing = [];
let totalCalls = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(callRe)) {
    totalCalls += 1;
    const method = m[1].toUpperCase();
    const raw = m[3];
    if (raw.startsWith('${')) continue; // base dinâmica (const) — revisão manual, não acionável
    const normPath = normalizeCall(raw);
    if (!callMatchesProxy(method, normPath)) {
      missing.push({ method, path: raw, rel: f.replace(join(ROOT, 'frontend') + '\\', '').replace(/\\/g, '/') });
    }
  }
}

// ---- 3. Relatório ----
const deduped = [];
const seen = new Set();
for (const miss of missing) {
  const key = `${miss.method} ${miss.path.replace(/\$\{[^}]+\}.*$/, '')}`;
  if (seen.has(key)) continue;
  if (KNOWN_DEAD_CALLS.has(key)) { console.log(`⚠ known dead call (ver allowlist): ${key}`); continue; }
  seen.add(key);
  deduped.push(miss);
}

console.log(`BFF proxy: ${proxyRoutes.size} rotas registradas · frontend: ${totalCalls} chamadas apiClient analisadas`);
if (deduped.length === 0) {
  console.log('✅ contrato ok — toda chamada do frontend tem rota no BFF');
  process.exit(0);
}
console.log(`❌ ${deduped.length} chamada(s) do frontend SEM rota no BFF proxy:`);
for (const miss of deduped) {
  console.log(`  ${miss.method} ${miss.path}   (${miss.rel})`);
}
console.log('\nAdicione em apis/src/domains/proxy/proxy.routes.ts antes de mergear.');
process.exit(1);
