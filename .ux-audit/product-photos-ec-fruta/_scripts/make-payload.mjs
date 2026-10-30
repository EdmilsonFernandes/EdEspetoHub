// Gera o script JS a injetar no container backend (payload embutido).
// Uso: node make-payload.mjs <mapping.json> <saida.js> [--ids id1,id2]
// mapping.json: [{ productId, name, file (em final/), source, license, sourceUrl, artist }]
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'C:/Users/esantos/projeto-pessoal/EdEspetoHub/.ux-audit/product-photos-ec-fruta';
const [mappingFile, outPath, ...rest] = process.argv.slice(2);
const onlyIds = rest.includes('--ids') ? rest[rest.indexOf('--ids') + 1].split(',') : null;

const mapping = JSON.parse(await fs.readFile(mappingFile, 'utf8'));
const STORE_ID = '8eb24290-d973-457b-8d5e-94fa62bfa696';

const items = [];
for (const m of mapping) {
  if (onlyIds && !onlyIds.includes(m.productId)) continue;
  const b64 = await fs.readFile(path.join(ROOT, 'final', m.file), 'base64');
  items.push({ productId: m.productId, name: m.name, b64, source: m.source, license: m.license, sourceUrl: m.sourceUrl, artist: m.artist });
}

const script = `// Auto-gerado: cadastra fotos de produtos EC Ponto da Fruta (somente image_url vazia)
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
      const rel = await saveBase64Image('data:image/webp;base64,' + item.b64, 'product-${STORE_ID}-' + item.productId, 'products');
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
await fs.writeFile(outPath, script);
console.log(`Payload com ${items.length} produto(s) -> ${outPath} (${Math.round(script.length / 1024)}KB)`);
