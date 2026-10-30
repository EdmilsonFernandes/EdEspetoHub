// Passo 6a: gera o script JS autocontido (payload embutido) para injetar no container.
// Lê storeId do config.json do workdir e os webp de final/ conforme mapping.json.
// Uso: node make-payload.mjs <workdir>/mapping.json <saida.js> [--ids id1,id2]
import fs from 'node:fs';
import path from 'node:path';

const [mappingFile, outPath, ...rest] = process.argv.slice(2);
if (!mappingFile || !outPath) {
  console.error('uso: node make-payload.mjs <workdir>/mapping.json <saida.js> [--ids id1,id2]');
  process.exit(1);
}
const onlyIds = rest.includes('--ids') ? rest[rest.indexOf('--ids') + 1].split(',') : null;

const workdir = path.dirname(path.resolve(mappingFile));
const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
const configPath = path.join(workdir, 'config.json');
const storeId = JSON.parse(fs.readFileSync(configPath, 'utf8')).storeId;

const items = [];
for (const m of mapping) {
  if (onlyIds && !onlyIds.includes(m.productId)) continue;
  const b64 = fs.readFileSync(path.join(workdir, 'final', m.file), 'base64');
  items.push({
    productId: m.productId, name: m.name, b64,
    source: m.source, license: m.license, sourceUrl: m.sourceUrl, artist: m.artist,
  });
}

const script = `// Auto-gerado pelo kit product-photos: cadastra fotos SOMENTE onde image_url é vazio.
const { loadSsmEnv } = require('/app/dist/config/ssm.js');
(async () => {
  await loadSsmEnv();
  const { saveBase64Image } = require('/app/dist/utils/imageStorage.js');
  const { Client } = require('/app/node_modules/pg');
  const payload = ${JSON.stringify(items)};
  const client = new Client({
    host: process.env.PGHOST, port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.PGDATABASE,
  });
  await client.connect();
  let ok = 0, skip = 0, fail = 0;
  for (const item of payload) {
    try {
      const cur = await client.query('SELECT image_url FROM products WHERE id = $1', [item.productId]);
      if (!cur.rows.length) { console.log('NAO_ENCONTRADO |', item.name); fail++; continue; }
      if (cur.rows[0].image_url) { console.log('SKIP_JA_TEM_FOTO |', item.name); skip++; continue; }
      const rel = await saveBase64Image('data:image/webp;base64,' + item.b64, 'product-${storeId}-' + item.productId, 'products');
      if (!rel) { console.log('FALHA_UPLOAD |', item.name); fail++; continue; }
      const upd = await client.query("UPDATE products SET image_url = $1 WHERE id = $2 AND (image_url IS NULL OR image_url = '')", [rel, item.productId]);
      if (upd.rowCount === 1) { console.log('OK |', item.name, '|', rel, '|', item.license); ok++; }
      else { console.log('SKIP_CONCORRENCIA |', item.name); skip++; }
    } catch (e) { console.log('ERRO |', item.name, '|', e.message); fail++; }
  }
  console.log('RESUMO', JSON.stringify({ ok, skip, fail }));
  await client.end();
})().catch((e) => { console.error('FATAL', e && e.message); process.exit(1); });
`;
fs.writeFileSync(outPath, script);
console.log(`Payload com ${items.length} produto(s) -> ${outPath} (${Math.round(script.length / 1024)}KB)`);
