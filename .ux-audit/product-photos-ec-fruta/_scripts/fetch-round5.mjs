// Rodada 5: Openverse (licenças comerciais) para medalhão/batata + re-download dos perdidos do Commons.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'C:/Users/esantos/projeto-pessoal/EdEspetoHub/.ux-audit/product-photos-ec-fruta';
const RAW = path.join(ROOT, 'raw');
const UA = 'JanoCaminhoProductPhotos/1.0 (edmilson.lopes@janocaminho.com.br)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dl(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`dl ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 15_000) throw new Error(`small ${buf.length}`);
  await fs.writeFile(dest, buf);
  return buf.length;
}

// --- Openverse ---
async function openverse(q, extra = '') {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm,by,by-sa&size=large&page_size=20${extra}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`ov ${res.status}`);
  const json = await res.json();
  return (json.results || []).map((r) => ({
    title: r.title || '', pageUrl: r.foreign_landing_url || '', fileUrl: r.url,
    width: r.width || 0, height: r.height || 0,
    license: (r.license || '').toUpperCase() + ' ' + (r.license_version || ''),
    artist: r.creator || 'unknown', source: r.source || 'openverse',
  })).filter((c) => Math.max(c.width, c.height) >= 700 && /\.(jpe?g|png|webp)(\?|$)/i.test(c.fileUrl));
}

// 1) Batata crua (Openverse: Flickr tem ótimas)
// 2) Medalhão de frango (Openverse)
// 3) Jantinha PF com carne (Openverse)
const OV = [
  { n: '21-batata', queries: ['raw potatoes pile', 'potatoes harvest', 'batatas'], must: /potato|batata/i },
  { n: '04-medalhao-frango', queries: ['grilled chicken pieces', 'chicken skewers grilled', 'frango grelhado'], must: /chicken|frango/i },
  { n: '31-jantinha', queries: ['arroz feijão', 'prato feito brasileiro', 'brazilian rice beans plate'], must: /arroz|feij|rice|bean|prato|comida/i },
];

const out = [];
for (const p of OV) {
  const files = [];
  outer: for (const q of p.queries) {
    let rs = [];
    try { rs = await openverse(q); } catch (e) { console.log(`[OV ${p.n}] "${q}" erro ${e.message}`); }
    for (const c of rs.filter((c) => p.must.test(c.title)).slice(0, 3)) {
      const idx = files.length + 1;
      const file = `${p.n}-o${idx}.jpg`;
      try {
        const size = await dl(c.fileUrl, path.join(RAW, file));
        files.push({ file, ...c, bytes: size });
        console.log(`[OV ${p.n}] o${idx} "${c.title.slice(0, 60)}" ${c.license} (${c.source})`);
      } catch (e) { console.log(`[OV ${p.n}] o${idx} dl falhou: ${e.message}`); }
      await sleep(400);
      if (files.length >= 2) break outer;
    }
    await sleep(600);
  }
  out.push({ ...p, files });
}

// 2) Re-baixar os perdidos do Commons (canary melon + arroz carreteiro)
const RE = [
  { file: '15-melao-x1.jpg', title: 'File:Canary melon 2010.jpg' },
  { file: '31-jantinha-x1.jpg', title: 'File:Arroz Carreteiro 1.jpg' },
];
for (const r of RE) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', titles: r.title,
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1200',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } });
  const json = await res.json();
  const page = Object.values(json.query.pages)[0];
  const ii = page?.imageinfo?.[0];
  if (ii) {
    const md = ii.extmetadata || {};
    const strip = (v) => String(v ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const size = await dl(ii.thumburl || ii.url, path.join(RAW, r.file));
    out.push({ n: r.file.replace(/-x1\.jpg$/, ''), files: [{ file: r.file, title: r.title, pageUrl: ii.descriptionurl, license: strip(md.LicenseShortName?.value) || 'unknown', artist: strip(md.Artist?.value) || 'unknown', bytes: size }] });
    console.log(`[RE] ${r.file} "${r.title}" ok`);
  } else { console.log(`[RE] ${r.title} FALHOU`); }
  await sleep(300);
}

await fs.writeFile(path.join(ROOT, 'meta-round5.json'), JSON.stringify(out, null, 2));
console.log('\nRodada 5 concluída.');
