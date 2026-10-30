// Passo 1 do kit de fotos: acha a loja no EC2, lista produtos sem foto e gera a
// estrutura + config.json inicial (queries sugeridas a partir do nome).
// Uso: node bootstrap-config.mjs <nomeOuSlug> <workdir> [--key CAMINHO] [--host HOST] [--todos]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const [storeArg, workdirArg] = args;
if (!storeArg || !workdirArg) {
  console.error('uso: node bootstrap-config.mjs <nomeOuSlug> <workdir> [--key CAMINHO] [--host HOST] [--todos]');
  process.exit(1);
}
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const KEY = flag('--key') || 'D:/PESSOAL/PESSOAL/chamanoespeto-aws/medtrack-system.pem';
const HOST = flag('--host') || 'ec2-user@ec2-3-137-119-152.us-east-2.compute.amazonaws.com';
const TODOS = args.includes('--todos');

const ssh = (sql) => execFileSync('ssh', [
  '-i', KEY, '-o', 'ConnectTimeout=15', HOST,
  `docker exec janocaminho-postgres psql -U postgres -d espetinho -t -A -F'|' -c "${sql.replace(/"/g, '\\"')}"`,
], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }).trim();

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeArg);
const storeWhere = isUuid ? `id='${storeArg}'` : (storeArg.includes(' ')
  ? `name ILIKE '%${storeArg.replace(/'/g, "''")}%'`
  : `slug='${storeArg.replace(/'/g, "''")}' OR name ILIKE '%${storeArg.replace(/'/g, "''")}%'`);

const stores = ssh(`SELECT id, name, slug, open FROM stores WHERE ${storeWhere};`)
  .split('\n').filter(Boolean).map((l) => {
    const [id, name, slug, open] = l.split('|');
    return { id, name, slug, open };
  });
if (!stores.length) { console.error('Loja não encontrada:', storeArg); process.exit(1); }
if (stores.length > 1) {
  console.error('Várias lojas casaram — passe o slug exato de uma delas:');
  for (const s of stores) console.error(`  ${s.slug} | ${s.name} | open=${s.open}`);
  process.exit(1);
}
const store = stores[0];

const filtro = TODOS ? '' : " AND (image_url IS NULL OR image_url='')";
const products = ssh(`SELECT id, name FROM products WHERE store_id='${store.id}'${filtro} ORDER BY category, name;`)
  .split('\n').filter(Boolean).map((l) => {
    const [id, ...rest] = l.split('|');
    return { id, name: rest.join('|') };
  });

// Sugestão de queries: nome sem unidades/embalagens + termo base
const sugerir = (name) => {
  const limpo = name
    .replace(/\((kg|g|unidade|un|un\.|l|ml|pote [^)]*|caixa [^)]*|bandeja [^)]*|pacote [^)]*|500g|1kg)\)/gi, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
  const palavras = limpo.split(' ').filter((p) => p.length > 2);
  const qs = [limpo];
  if (palavras.length >= 2) qs.push(palavras.slice(0, 2).join(' '));
  return [...new Set(qs)];
};

const config = {
  storeId: store.id, storeSlug: store.slug, storeName: store.name,
  products: products.map((p) => ({ id: p.id, name: p.name, queries: sugerir(p.name) })),
};

const workdir = path.resolve(workdirArg);
for (const d of ['raw', 'final', '_scripts', 'shots']) fs.mkdirSync(path.join(workdir, d), { recursive: true });
const cfgPath = path.join(workdir, 'config.json');
if (fs.existsSync(cfgPath)) {
  fs.copyFileSync(cfgPath, cfgPath + '.bak');
  console.log(`config.json existente -> backup em config.json.bak`);
}
fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2));

console.log(`Loja: ${store.name} (slug: ${store.slug}, open=${store.open})`);
console.log(`Produtos ${TODOS ? 'totais' : 'SEM foto'}: ${products.length}`);
console.log(`Estrutura criada em: ${workdir}`);
console.log(`Config inicial: ${cfgPath} (revise as queries — o agente refina na busca)`);
