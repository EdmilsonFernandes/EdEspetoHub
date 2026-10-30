// Rodada 2: re-busca direcionada com filtro de palavra-chave no título do arquivo.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'C:/Users/esantos/projeto-pessoal/EdEspetoHub/.ux-audit/product-photos-ec-fruta';
const RAW = path.join(ROOT, 'raw');
const UA = 'JanoCaminhoProductPhotos/1.0 (edmilson.lopes@janocaminho.com.br)';

// must: regex que o título precisa casar (senão o resultado é descartado)
const RETRIES = [
  { n: '02-espetinho-frango', must: /frango|chicken/i, queries: ['espetinho de frango', 'chicken thigh skewers', 'espeto frango grelhado'] },
  { n: '03-espetinho-misto', must: /espet|misto|skewer|kebab/i, queries: ['espetinhos carne frango', 'mixed skewers grill', 'espeto misto carne'] },
  { n: '04-medalhao-frango', must: /frango|chicken/i, queries: ['medalhão de frango', 'frango em cubos', 'chicken cubes grilled'] },
  { n: '07-banana-prata', must: /banana/i, queries: ['banana amarela cacho', 'bananas maduras', 'bananeira cacho'] },
  { n: '09-maca-gala', must: /gala/i, queries: ['Gala apples', 'maçãs gala', 'gala apple red'] },
  { n: '11-mamao-formosa', must: /papaya|mamão/i, queries: ['Carica papaya fruit', 'mamão formosa', 'papaya whole'] },
  { n: '12-manga-palmer', must: /mang[oa]/i, queries: ['manga fruta vermelha', 'red mango whole', 'mangas mercado'] },
  { n: '13-manga-tomy', must: /tommy|mang[oa]/i, queries: ['Tommy Atkins mango', 'mango green red', 'mangifera indica mango whole'] },
  { n: '16-uva-thompson', must: /grape|uva|sultana|thompson/i, queries: ['Thompson Seedless grapes', 'uvas verdes', 'green grapes seedless'] },
  { n: '18-abobora-cabotia', must: /kabocha|caboti|abóbora|squash/i, queries: ['kabocha squash whole', 'abóbora cabotiá inteira', 'tetsukabuto'] },
  { n: '21-batata', must: /potato|batata/i, queries: ['potatoes pile raw', 'batatas cruas', 'Solanum tuberosum tubers'] },
  { n: '22-batata-doce', must: /sweet potato|batata/i, queries: ['sweet potatoes pile', 'batata-doce raiz', 'Ipomoea batatas roots'] },
  { n: '23-beterraba', must: /beet|beterraba/i, queries: ['beetroot tubers', 'beterrabas cruas', 'red beets raw'] },
  { n: '24-cebola', must: /onion|cebola/i, queries: ['yellow onion bulbs', 'cebolas amarelas', 'onions pile'] },
  { n: '25-cebola-roxa', must: /red onion|cebola roxa|purple onion/i, queries: ['red onion bulbs', 'cebolas roxas', 'red onions pile'] },
  { n: '26-cenoura', must: /carrot|cenoura/i, queries: ['carrots pile', 'cenouras feira', 'Daucus carota roots market'] },
  { n: '27-chuchu', must: /chayote|chuchu|sechium/i, queries: ['Sechium edule fruit', 'chayote squash', 'chuchu fruto'] },
  { n: '31-jantinha', must: /arroz|feijão|rice|beans|prato|marmita|comida/i, queries: ['prato arroz feijão', 'arroz e feijão', 'marmita brasileira'] },
  { n: '32-alho-descascado', must: /garlic|alho/i, queries: ['garlic cloves peeled bowl', 'dentes de alho descascados', 'peeled garlic'] },
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

const meta2 = [];
for (const p of RETRIES) {
  const files = [];
  outer: for (const q of p.queries) {
    let results = [];
    try { results = await searchCommons(q); } catch (e) { console.log(`[${p.n}] "${q}" erro ${e.message}`); }
    const matched = results.filter((c) => p.must.test(c.title));
    for (const c of matched.slice(0, 2)) {
      const idx = files.length + 1;
      const ext = c.mime.includes('png') ? 'png' : c.mime.includes('webp') ? 'webp' : 'jpg';
      const file = `${p.n}-r${idx}.${ext}`;
      try {
        const size = await download(c.thumbUrl, path.join(RAW, file));
        files.push({ file, ...c, bytes: size });
        console.log(`[${p.n}] r${idx} "${c.title}" ${c.license}`);
      } catch (e) { console.log(`[${p.n}] r${idx} dl falhou ${e.message}`); }
      await sleep(120);
      if (files.length >= 2) break outer;
    }
    await sleep(150);
  }
  if (!files.length) console.log(`[${p.n}] SEM candidato na rodada 2!`);
  meta2.push({ ...p, files });
}
await fs.writeFile(path.join(ROOT, 'meta-round2.json'), JSON.stringify(meta2, null, 2));
console.log(`\nRodada 2: ${meta2.filter((m) => m.files.length).length}/${RETRIES.length} re-buscados com candidatos.`);
