// Passo 5: padroniza aprovados em WebP 800x800 (contain, fundo branco, q82).
// Uso: node process.mjs <workdir> raw/arquivo1.jpg [raw/arquivo2.jpg ...]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [workdirArg, ...files] = process.argv.slice(2);
if (!workdirArg || !files.length) {
  console.error('uso: node process.mjs <workdir> raw/arquivo1.jpg [raw/arquivo2.jpg ...]');
  process.exit(1);
}
const workdir = path.resolve(workdirArg);
const FINAL = path.join(workdir, 'final');
fs.mkdirSync(FINAL, { recursive: true });

// sharp do backend (o projeto já depende dele) — resolvido relativo a este script
const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const sharp = require('sharp');

for (const rel of files) {
  const src = path.resolve(workdir, rel);
  const out = path.join(FINAL, path.basename(rel).replace(/\.(jpe?g|png|webp)$/i, '') + '.webp');
  const buf = await fs.promises.readFile(src);
  const result = await sharp(buf, { failOn: 'none' })
    .resize({ width: 800, height: 800, fit: 'contain', background: '#ffffff' })
    .webp({ quality: 82 })
    .toBuffer();
  await fs.promises.writeFile(out, result);
  const meta = await sharp(result).metadata();
  console.log(`${path.basename(out)}: ${meta.width}x${meta.height} ${Math.round(result.length / 1024)}KB`);
}
