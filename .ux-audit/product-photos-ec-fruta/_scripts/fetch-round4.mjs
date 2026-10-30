// Rodada 4: últimos furos de cobertura.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'C:/Users/esantos/projeto-pessoal/EdEspetoHub/.ux-audit/product-photos-ec-fruta';
const RAW = path.join(ROOT, 'raw');
const UA = 'JanoCaminhoProductPhotos/1.0 (edmilson.lopes@janocaminho.com.br)';

const RETRIES = [
  { n: '04-medalhao-frango', must: /frango|chicken|medalh/i, queries: ['chicken medallions', 'medalhão de frango grelhado', 'frango grelhado porção'] },
  { n: '15-melao', must: /melon|melão/i, queries: ['canary melon', 'honeydew melon whole', 'melon isolated'] },
  { n: '21-batata', must: /potato|batata/i, queries: ['raw potatoes white background', 'batatas cruas feira', 'potatoes harvest pile raw'] },
  { n: '31-jantinha', must: /arroz|feijão|rice|beans|prato|bife|marmita/i, queries: ['arroz feijão bife', 'prato arroz carne', 'marmita comida'] },
  { n: '03-espetinho-misto', must: /espet|skewer|churrasco|satay|kebab/i, queries: ['espetos churrasco carne', 'beef skewers grill', 'grilled beef skewer barbecue'] },
  { n: '04-medalhao-frango', must: /frango|chicken/i, queries: ['frango grelhado espeto', 'grilled chicken breast pieces', 'frango assado pedaços'] },
  { n: '14-maracuja', must: /passion|maracuj/i, queries: ['purple passion fruit whole', 'maracujá frutos', 'passion fruit purple ripe'] },
  { n: '15-melao', must: /melon|melão/i, queries: ['yellow melon whole fruit', 'melão inteiro', 'melon yellow whole'] },
  { n: '21-batata', must: /potato|batata/i, queries: ['Solanum tuberosum potatoes', 'batatas pilha', 'potato tubers harvest pile'] },
  { n: '31-jantinha', must: /arroz|feijão|rice|beans|prato|marmita/i, queries: ['prato feito', 'arroz feijão e carne', 'comida brasileira prato feito'] },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const meta3 = [];
for (const p of RETRIES) {
  const files = [];
  outer: for (const q of p.queries) {
    let results = [];
    try { results = await searchCommons(q); } catch (e) { console.log(`[${p.n}] "${q}" erro ${e.message}`); }
    const matched = results.filter((c) => p.must.test(c.title));
    for (const c of matched.slice(0, 2)) {
      const idx = files.length + 1;
      const ext = c.mime.includes('png') ? 'png' : c.mime.includes('webp') ? 'webp' : 'jpg';
      const file = `${p.n}-x${idx}.${ext}`;
      try {
        const size = await download(c.thumbUrl, path.join(RAW, file));
        files.push({ file, ...c, bytes: size });
        console.log(`[${p.n}] x${idx} "${c.title}" ${c.license}`);
      } catch (e) { console.log(`[${p.n}] x${idx} dl falhou ${e.message}`); }
      await sleep(120);
      if (files.length >= 2) break outer;
    }
    await sleep(150);
  }
  if (!files.length) console.log(`[${p.n}] SEM candidato na rodada 3!`);
  meta3.push({ ...p, files });
}
await fs.writeFile(path.join(ROOT, 'meta-round4.json'), JSON.stringify(meta3, null, 2));
console.log(`\nRodada 4: ${meta3.filter((m) => m.files.length).length}/${RETRIES.length} com candidatos.`);
