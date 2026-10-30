// Processa as imagens aprovadas: 800x800 WebP, contain (produto inteiro), fundo branco.
// Uso: node process.mjs <rawfile1> <rawfile2> ... (ou sem args para processar o mapeamento approved.json)
import fs from 'node:fs/promises';
import path from 'node:path';
// sharp resolvido direto do node_modules do backend
const sharp = (await import('file:///C:/Users/esantos/projeto-pessoal/EdEspetoHub/backend/node_modules/sharp/dist/index.mjs')).default;

const ROOT = 'C:/Users/esantos/projeto-pessoal/EdEspetoHub/.ux-audit/product-photos-ec-fruta';
const RAW = path.join(ROOT, 'raw');
const FINAL = path.join(ROOT, 'final');

async function processOne(rawName) {
  const src = path.join(RAW, rawName);
  const outName = rawName.replace(/\.(jpe?g|png|webp)$/i, '') + '.webp';
  const dest = path.join(FINAL, outName);
  const buf = await fs.readFile(src);
  const out = await sharp(buf, { failOn: 'none' })
    .resize({ width: 800, height: 800, fit: 'contain', background: '#ffffff', withoutEnlargement: false })
    .webp({ quality: 82 })
    .toBuffer();
  await fs.writeFile(dest, out);
  const meta = await sharp(out).metadata();
  return { outName, bytes: out.length, w: meta.width, h: meta.height };
}

const args = process.argv.slice(2);
if (args.length) {
  for (const a of args) {
    const r = await processOne(a);
    console.log(`${r.outName}: ${r.w}x${r.h} ${Math.round(r.bytes / 1024)}KB`);
  }
} else {
  console.log('use: node process.mjs <arquivos>');
}
