// Passo 3: busca candidatos no Wikimedia Commons por produto do config.json.
// Baixa até 2 candidatos por produto em <workdir>/raw/ e grava meta.json com licença/autor.
// Uso: node fetch-candidates.mjs <workdir>/config.json [--max N]
import fs from 'node:fs';
import path from 'node:path';

const cfgPath = process.argv[2];
if (!cfgPath) { console.error('uso: node fetch-candidates.mjs <workdir>/config.json'); process.exit(1); }
const MAX = process.argv.includes('--max') ? Number(process.argv[process.argv.indexOf('--max') + 1]) : 2;

const workdir = path.dirname(path.resolve(cfgPath));
const RAW = path.join(workdir, 'raw');
const UA = 'JanoCaminhoProductPhotos/1.0 (edmilson.lopes@janocaminho.com.br)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (v) => String(v ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const toInfo = (p, ii) => {
  const md = ii.extmetadata || {};
  return {
    title: p.title, pageUrl: ii.descriptionurl || '', fileUrl: ii.url,
    thumbUrl: ii.thumburl || ii.url, width: ii.width, height: ii.height, mime: ii.mime,
    license: strip(md.LicenseShortName?.value) || 'unknown',
    artist: strip(md.Artist?.value) || strip(md.Credit?.value) || 'unknown',
  };
};
const valida = (c) => /jpeg|png|webp/.test(c.mime) && Math.min(c.width, c.height) >= 500 && Math.max(c.width, c.height) >= 700;

async function apiCommons(params) {
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams(params)}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`api ${res.status}`);
  const json = await res.json();
  return json?.query?.pages ? Object.values(json.query.pages) : [];
}

// Modo busca (queries + must) — fallback para modo categoria (cat/include/exclude)
async function porBusca(q, must) {
  const re = must ? new RegExp(must, 'i') : null;
  const pages = await apiCommons({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: `filetype:bitmap ${q}`, gsrnamespace: '6', gsrlimit: '25',
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1200',
  });
  return pages.filter((p) => p?.imageinfo?.[0]).map((p) => toInfo(p, p.imageinfo[0]))
    .filter(valida).filter((c) => !re || re.test(c.title));
}

// Modo categoria (primeira página de 100 arquivos — suficiente com include/exclude)
async function porCategoria(cat, include, exclude) {
  const inc = include ? new RegExp(include, 'i') : null;
  const exc = exclude ? new RegExp(exclude, 'i') : null;
  const pages = await apiCommons({
    action: 'query', format: 'json', generator: 'categorymembers',
    gcmtitle: cat, gcmtype: 'file', gcmlimit: '100',
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1200',
  });
  const out = [];
  for (const p of pages) {
    const ii = p?.imageinfo?.[0];
    if (!ii) continue;
    if (inc && !inc.test(p.title)) continue;
    if (exc && exc.test(p.title)) continue;
    out.push(toInfo(p, ii));
  }
  return out.filter(valida).sort((a, b) => b.width * b.height - a.width * a.height);
}

async function baixar(c, dest) {
  const res = await fetch(c.thumbUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 15_000) throw new Error(`pequeno demais (${buf.length}B)`);
  await fs.promises.writeFile(dest, buf);
  return buf.length;
}

const config = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const metaPath = path.join(workdir, 'meta.json');
const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : [];

for (const p of config.products) {
  const slug = (p.name || p.id).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const files = [];
  try {
    if (p.cat) {
      const rs = await porCategoria(p.cat, p.include, p.exclude);
      for (const c of rs.slice(0, MAX)) {
        const file = `${slug}-${files.length + 1}.${c.mime.includes('png') ? 'png' : c.mime.includes('webp') ? 'webp' : 'jpg'}`;
        try { files.push({ file, ...c, bytes: await baixar(c, path.join(RAW, file)) }); } catch (e) { console.log(`  dl falhou: ${e.message}`); }
        await sleep(120);
      }
    } else {
      outer: for (const q of p.queries || []) {
        let rs = [];
        try { rs = await porBusca(q, p.must); } catch (e) { console.log(`  "${q}" erro ${e.message}`); }
        for (const c of rs.slice(0, 2)) {
          const file = `${slug}-${files.length + 1}.${c.mime.includes('png') ? 'png' : c.mime.includes('webp') ? 'webp' : 'jpg'}`;
          try { files.push({ file, ...c, bytes: await baixar(c, path.join(RAW, file)) }); } catch (e) { console.log(`  dl falhou: ${e.message}`); }
          await sleep(120);
          if (files.length >= MAX) break outer;
        }
        await sleep(150);
      }
    }
  } catch (e) { console.log(`[${p.name}] ERRO: ${e.message}`); }
  const log = files.length ? files.map((f) => `  ${f.file} | ${f.title} | ${f.license}`).join('\n') : '  SEM candidato — ajuste queries/must ou use cat';
  console.log(`[${p.name}]\n${log}`);
  meta.push({ productId: p.id, name: p.name, files });
  await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2));
}
console.log(`\nmeta.json em ${metaPath}`);
