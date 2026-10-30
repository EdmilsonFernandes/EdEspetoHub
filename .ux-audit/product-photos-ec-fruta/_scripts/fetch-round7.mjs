// Rodada 7: últimos 4 (espetinho misto, medalhão, maracujá, batata) com termos alternativos.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'C:/Users/esantos/projeto-pessoal/EdEspetoHub/.ux-audit/product-photos-ec-fruta';
const RAW = path.join(ROOT, 'raw');
const UA = 'JanoCaminhoProductPhotos/1.0 (edmilson.lopes@janocaminho.com.br)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RETRIES = [
  { n: '21-batata', must: /kartoffel|potato|batata|pomme/i, queries: ['rohe Kartoffeln', 'patatas crudas', 'raw potatoes table'] },
  { n: '14-maracuja', must: /passion|maracuj|granadill|passionsfrucht/i, queries: ['Passionsfrucht', 'purple passion fruits', 'maracujá maduro'] },
  { n: '04-medalhao-frango', must: /frango|chicken|hähnchen|medalh|meatball/i, queries: ['chicken meatball skewers', 'Hähnchen Spieße', 'frango espetinho'] },
  { n: '03-espetinho-misto', must: /espet|schaschlik|satay|skewer|kebab|anticucho|spie/i, queries: ['Schaschlik', 'espetada mista', 'mixed skewers grill meat'] },
];

async function searchCommons(query) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: `filetype:bitmap ${query}`, gsrnamespace: '6', gsrlimit: '25',
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1200',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`api ${res.status}`);
  const json = await res.json();
  const pages = json?.query?.pages ? Object.values(json.query.pages) : [];
  return pages.filter((p) => p?.imageinfo?.[0]).map((p) => {
    const ii = p.imageinfo[0];
    const md = ii.extmetadata || {};
    const strip = (v) => String(v ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      title: p.title, pageUrl: ii.descriptionurl || '', fileUrl: ii.url,
      thumbUrl: ii.thumburl || ii.url, width: ii.width, height: ii.height, mime: ii.mime,
      license: strip(md.LicenseShortName?.value) || 'unknown',
      artist: strip(md.Artist?.value) || strip(md.Credit?.value) || 'unknown',
    };
  }).filter((c) => /jpeg|png|webp/.test(c.mime) && Math.min(c.width, c.height) >= 500 && Math.max(c.width, c.height) >= 700);
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 15_000) throw new Error(`too small ${buf.length}`);
  await fs.writeFile(dest, buf);
  return buf.length;
}

const meta7 = [];
for (const p of RETRIES) {
  const files = [];
  outer: for (const q of p.queries) {
    let results = [];
    try { results = await searchCommons(q); } catch (e) { console.log(`[${p.n}] "${q}" erro ${e.message}`); }
    for (const c of results.filter((c) => p.must.test(c.title)).slice(0, 3)) {
      const idx = files.length + 1;
      const ext = c.mime.includes('png') ? 'png' : c.mime.includes('webp') ? 'webp' : 'jpg';
      const file = `${p.n}-z${idx}.${ext}`;
      try {
        const size = await download(c.thumbUrl, path.join(RAW, file));
        files.push({ file, ...c, bytes: size });
        console.log(`[${p.n}] z${idx} "${c.title.slice(0, 80)}" ${c.license}`);
      } catch (e) { console.log(`[${p.n}] z${idx} dl falhou ${e.message}`); }
      await sleep(120);
      if (files.length >= 2) break outer;
    }
    await sleep(150);
  }
  if (!files.length) console.log(`[${p.n}] SEM candidato na rodada 7!`);
  meta7.push({ ...p, files });
}
await fs.writeFile(path.join(ROOT, 'meta-round7.json'), JSON.stringify(meta7, null, 2));
console.log(`\nRodada 7: ${meta7.filter((m) => m.files.length).length}/${RETRIES.length} com candidatos.`);
