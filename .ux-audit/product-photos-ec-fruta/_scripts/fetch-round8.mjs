// Rodada 8: navegação por CATEGORIA do Commons com filtros de título.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'C:/Users/esantos/projeto-pessoal/EdEspetoHub/.ux-audit/product-photos-ec-fruta';
const RAW = path.join(ROOT, 'raw');
const UA = 'JanoCaminhoProductPhotos/1.0 (edmilson.lopes@janocaminho.com.br)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CATS = [
  {
    n: '21-batata', cat: 'Category:Potatoes',
    include: /basket|pile|pile|raw|harvest|box|sack|fresh|new potatoes|market|kg|kg|sack/i,
    exclude: /dish|fries|chips|soup|salad|bread|cake|field|plant|flower|farm|beetle|disease|book|blight|virus|pest|label|war|fungus/i,
  },
  {
    n: '14-maracuja', cat: 'Category:Passiflora edulis',
    include: /fruit|maracuj|passionfruit|passion fruit/i,
    exclude: /flower|flor|blossom|leaf|leaves|plant|vine|seed|cut|cross|halve|Wellcome|illustration|drawing/i,
  },
  {
    n: '04-medalhao-frango', cat: 'Category:Grilled chicken',
    include: /breast|piece|strip|cube|skewer|spie|frango|thigh|fillet|medallion/i,
    exclude: /whole|burger|sandwich|wing|bbq sauce|restaurant|sign|menu|shop|burger|pizza|kebab shop/i,
  },
];

async function categoryFiles(cat, include, exclude) {
  const files = [];
  let cont;
  do {
    const params = new URLSearchParams({
      action: 'query', format: 'json', generator: 'categorymembers',
      gcmtitle: cat, gcmtype: 'file', gcmlimit: '100',
      ...(cont ? { gcmcontinue: cont } : {}),
      prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1200',
    });
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`api ${res.status}`);
    const json = await res.json();
    const pages = json?.query?.pages ? Object.values(json.query.pages) : [];
    for (const p of pages) {
      const ii = p?.imageinfo?.[0];
      if (!ii) continue;
      const title = p.title;
      if (!include.test(title) || exclude.test(title)) continue;
      if (!/jpe?g|png|webp/i.test(ii.mime)) continue;
      if (Math.min(ii.width, ii.height) < 500 || Math.max(ii.width, ii.height) < 700) continue;
      const md = ii.extmetadata || {};
      const strip = (v) => String(v ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      files.push({
        title, pageUrl: ii.descriptionurl || '', fileUrl: ii.url,
        thumbUrl: ii.thumburl || ii.url, width: ii.width, height: ii.height, mime: ii.mime,
        license: strip(md.LicenseShortName?.value) || 'unknown',
        artist: strip(md.Artist?.value) || strip(md.Credit?.value) || 'unknown',
      });
    }
    cont = json?.continue?.gcmcontinue;
  } while (cont && files.length < 12);
  return files.sort((a, b) => b.width * b.height - a.width * a.height);
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 15_000) throw new Error(`too small ${buf.length}`);
  await fs.writeFile(dest, buf);
  return buf.length;
}

const meta8 = [];
for (const c of CATS) {
  let files = [];
  try { files = await categoryFiles(c.cat, c.include, c.exclude); } catch (e) { console.log(`[${c.n}] categoria erro: ${e.message}`); }
  console.log(`[${c.n}] ${c.cat}: ${files.length} pré-filtrados`);
  const picked = [];
  for (const f of files.slice(0, 3)) {
    const idx = picked.length + 1;
    const ext = f.mime.includes('png') ? 'png' : f.mime.includes('webp') ? 'webp' : 'jpg';
    const file = `${c.n}-k${idx}.${ext}`;
    try {
      const size = await download(f.thumbUrl, path.join(RAW, file));
      picked.push({ file, ...f, bytes: size });
      console.log(`  k${idx} "${f.title.slice(0, 70)}" ${f.license}`);
    } catch (e) { console.log(`  k${idx} dl falhou ${e.message}`); }
    await sleep(120);
    if (picked.length >= 2) break;
  }
  if (!picked.length) console.log(`[${c.n}] SEM candidato na rodada 8!`);
  meta8.push({ n: c.n, cat: c.cat, files: picked });
  await sleep(200);
}
await fs.writeFile(path.join(ROOT, 'meta-round8.json'), JSON.stringify(meta8, null, 2));
console.log('\nRodada 8 concluída.');
