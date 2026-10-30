// Rodada 6: cobrir os ainda pendentes.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'C:/Users/esantos/projeto-pessoal/EdEspetoHub/.ux-audit/product-photos-ec-fruta';
const RAW = path.join(ROOT, 'raw');
const UA = 'JanoCaminhoProductPhotos/1.0 (edmilson.lopes@janocaminho.com.br)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RETRIES = [
  { n: '30-tomate', must: /tomate|tomato/i, queries: ['tomates vermelhos', 'red tomatoes pile', 'ripe red tomatoes'] },
  { n: '04-medalhao-frango', must: /frango|chicken/i, queries: ['frango grelhado', 'grilled chicken breast', 'peito de frango grelhado'] },
  { n: '21-batata', must: /potato|batata/i, queries: ['batatas', 'Solanum tuberosum tubers', 'potato tubers pile market'] },
  { n: '03-espetinho-misto', must: /espet|satay|skewer|kebab|anticucho/i, queries: ['satay mixed grill', 'espetinhos carne frango', 'mixed meat skewers'] },
  { n: '31-jantinha', must: /arroz|feijão|rice|beans|bife|prato|carne/i, queries: ['arroz com bife', 'bife com arroz e feijão', 'prato de comida brasileira'] },
  { n: '14-maracuja', must: /maracuj|passion/i, queries: ['maracujá fruto', 'passion fruit ripe purple', 'maracujás'] },
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

const meta6 = [];
for (const p of RETRIES) {
  const files = [];
  outer: for (const q of p.queries) {
    let results = [];
    try { results = await searchCommons(q); } catch (e) { console.log(`[${p.n}] "${q}" erro ${e.message}`); }
    for (const c of results.filter((c) => p.must.test(c.title)).slice(0, 3)) {
      const idx = files.length + 1;
      const ext = c.mime.includes('png') ? 'png' : c.mime.includes('webp') ? 'webp' : 'jpg';
      const file = `${p.n}-y${idx}.${ext}`;
      try {
        const size = await download(c.thumbUrl, path.join(RAW, file));
        files.push({ file, ...c, bytes: size });
        console.log(`[${p.n}] y${idx} "${c.title.slice(0, 80)}" ${c.license}`);
      } catch (e) { console.log(`[${p.n}] y${idx} dl falhou ${e.message}`); }
      await sleep(120);
      if (files.length >= 2) break outer;
    }
    await sleep(150);
  }
  if (!files.length) console.log(`[${p.n}] SEM candidato na rodada 6!`);
  meta6.push({ ...p, files });
}
await fs.writeFile(path.join(ROOT, 'meta-round6.json'), JSON.stringify(meta6, null, 2));
console.log(`\nRodada 6: ${meta6.filter((m) => m.files.length).length}/${RETRIES.length} com candidatos.`);
