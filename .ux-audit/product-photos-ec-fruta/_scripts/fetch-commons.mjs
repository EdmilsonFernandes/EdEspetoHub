// Busca candidatos de foto no Wikimedia Commons para os produtos da EC Ponto da Fruta.
// Baixa até 2 candidatos por produto (jpeg/png/webp, lado maior >= 700px) + metadados de licença.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'C:/Users/esantos/projeto-pessoal/EdEspetoHub/.ux-audit/product-photos-ec-fruta';
const RAW = path.join(ROOT, 'raw');
const UA = 'JanoCaminhoProductPhotos/1.0 (edmilson.lopes@janocaminho.com.br)';

const STORE_ID = '8eb24290-d973-457b-8d5e-94fa62bfa696';

const PRODUCTS = [
  { n: '01-espetinho-carne', id: 'ee2aedf9-dd0e-4af1-ab73-53a35c363967', queries: ['espetinho carne', 'beef skewer barbecue', 'grilled beef skewers'] },
  { n: '02-espetinho-frango', id: 'a9b944d9-f2ec-4ebf-963c-e8711ba49a2d', queries: ['espetinho frango', 'chicken skewer grill', 'grilled chicken skewers'] },
  { n: '03-espetinho-misto', id: '0cf3f91c-6615-4dda-bda3-ff6afe7d65cf', queries: ['espetinhos', 'mixed grill skewers', 'meat skewers grill'] },
  { n: '04-medalhao-frango', id: '8523f3a5-64c2-4286-ada4-86ed06deaccb', queries: ['medalhão frango', 'frango espeto', 'chicken skewers grilled'] },
  { n: '05-abacate', id: '101e08b5-d265-4add-b215-de7d9be6df2d', queries: ['abacate', 'avocado fruit whole'] },
  { n: '06-banana-nanica', id: '0a032f05-1e61-4e6f-8c8e-59fea45108d3', queries: ['banana nanica', 'banana cavendish', 'bananas yellow'] },
  { n: '07-banana-prata', id: '12f9d457-f20b-4216-a690-e975390389ca', queries: ['banana prata', 'ripe bananas', 'banana bunch'] },
  { n: '08-laranja-pera', id: '5b1ea75a-032c-4387-b4e0-b14de7df63fa', queries: ['laranja pera', 'orange fruit whole', 'oranges fresh'] },
  { n: '09-maca-gala', id: '594f4b46-52fe-4104-8bf0-8cd871f459c6', queries: ['maçã gala', 'gala apple', 'red apple fruit'] },
  { n: '10-maca-verde', id: '82860813-0954-44d6-95ec-2e4057744cc7', queries: ['maçã verde', 'granny smith apple', 'green apple'] },
  { n: '11-mamao-formosa', id: '4b494405-d9c6-4284-9245-641ef7d42d22', queries: ['mamão formosa', 'papaya fruit whole', 'papaya'] },
  { n: '12-manga-palmer', id: '58f49de0-c1d4-4e8a-ada6-fac43647095c', queries: ['manga palmer', 'palmer mango', 'red mango'] },
  { n: '13-manga-tomy', id: 'a4933e57-3316-4f3d-8337-35e57957c4e4', queries: ['manga tommy', 'tommy atkins mango', 'mango fruit whole'] },
  { n: '14-maracuja', id: '1e7de8e2-ca2c-44ed-8459-7d3f76f848c6', queries: ['maracujá fruta', 'passion fruit whole', 'passiflora edulis fruit'] },
  { n: '15-melao', id: '083e32e4-f762-4df5-8280-0b3c75169ebc', queries: ['melão amarelo', 'yellow melon', 'cantalupe melon'] },
  { n: '16-uva-thompson', id: '1133b1d2-69a0-4c68-a475-9cd47de56c96', queries: ['uva thompson', 'green grapes bunch', 'white grapes'] },
  { n: '17-uva-vitoria', id: '23da1e09-7a3e-4d53-9ef4-c4222cb0deb6', queries: ['uva vitória', 'red grapes bunch', 'purple grapes'] },
  { n: '18-abobora-cabotia', id: 'e2dda249-f145-4e89-a7aa-54927aa64a36', queries: ['abóbora cabotiá', 'cabotia squash', 'kabocha squash'] },
  { n: '19-abobrinha', id: '4b06944b-ff01-440d-9d7c-92822e3e5a93', queries: ['abobrinha italiana', 'abobrinha', 'zucchini green'] },
  { n: '20-alho', id: '13eea7ba-f740-4fc7-92f7-ed7638cb9ef1', queries: ['alho bulbo', 'garlic bulbs'] },
  { n: '21-batata', id: '22ad3e1a-9e9a-43d1-a800-ca855bb18582', queries: ['batata inglesa', 'potato raw', 'potatoes raw'] },
  { n: '22-batata-doce', id: '5efeb754-53bc-4036-83f4-796640eb08c3', queries: ['batata doce', 'sweet potato raw', 'sweet potatoes'] },
  { n: '23-beterraba', id: 'd74bfe55-88ab-4be8-97b4-03bc0165847c', queries: ['beterraba', 'beetroot raw', 'beets raw'] },
  { n: '24-cebola', id: 'fa0d39fe-d84c-4114-b438-7eec95bf8037', queries: ['cebola bulbo', 'onion bulbs yellow', 'yellow onions'] },
  { n: '25-cebola-roxa', id: '69845a88-5ca3-48db-9994-687037ee293c', queries: ['cebola roxa', 'red onion bulbs', 'red onions'] },
  { n: '26-cenoura', id: '0fea4514-9124-44ec-b518-90398927016a', queries: ['cenoura', 'carrots raw', 'carrot'] },
  { n: '27-chuchu', id: '72f454b6-d9a9-4f60-af41-b28805effd2c', queries: ['chuchu', 'chayote'] },
  { n: '28-inhame', id: 'd134c11e-f7f3-4d85-84c2-d4b0df1c3a13', queries: ['inhame', 'yam tuber', 'dioscorea yam'] },
  { n: '29-pepino', id: '4a259ff4-2c0e-4b4b-be98-309de576736f', queries: ['pepino', 'cucumber whole', 'cucumbers'] },
  { n: '30-tomate', id: 'bc52146b-fee1-42f8-b843-4e46b1e0efc9', queries: ['tomate', 'tomato raw', 'tomatoes red'] },
  { n: '31-jantinha', id: '9fedcf67-ca56-4781-a3c7-7d0b42ca4cf9', queries: ['prato feito brasileiro', 'espetinho arroz feijão', 'brazilian lunch plate rice beans'] },
  { n: '32-alho-descascado', id: '59d58d49-06f0-42d3-b762-e9200e2ac7f3', queries: ['alho descascado', 'peeled garlic cloves', 'garlic cloves peeled'] },
  { n: '33-alface-americana', id: '42622c80-500a-439c-8002-5bdfd89def54', queries: ['alface americana', 'iceberg lettuce'] },
  { n: '34-alface-crespa', id: '88a02fb3-3b0b-4851-849f-96d6caed9bd4', queries: ['alface crespa', 'curly lettuce', 'green leaf lettuce'] },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchCommons(query) {
  const params = new URLSearchParams({
    action: 'query', format: 'json',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: '6', gsrlimit: '20',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '1200',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`commons api ${res.status}`);
  const json = await res.json();
  const pages = json?.query?.pages ? Object.values(json.query.pages) : [];
  return pages
    .filter((p) => p?.imageinfo?.[0])
    .map((p) => {
      const ii = p.imageinfo[0];
      const md = ii.extmetadata || {};
      const strip = (v) => String(v ?? '')
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return {
        title: p.title,
        pageUrl: ii.descriptionurl || '',
        fileUrl: ii.url,
        thumbUrl: ii.thumburl || ii.url,
        width: ii.width, height: ii.height, mime: ii.mime,
        license: strip(md.LicenseShortName?.value) || 'unknown',
        artist: strip(md.Artist?.value) || strip(md.Credit?.value) || 'unknown',
      };
    })
    .filter((c) => /jpeg|png|webp/.test(c.mime) && Math.min(c.width, c.height) >= 500 && Math.max(c.width, c.height) >= 700)
    .sort((a, b) => b.width * b.height - a.width * a.height);
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 15_000) throw new Error(`too small ${buf.length}`);
  await fs.writeFile(dest, buf);
  return buf.length;
}

const meta = [];
for (const p of PRODUCTS) {
  const candidates = [];
  try {
    let queryUsed = '';
    for (const q of p.queries) {
      let results = [];
      try { results = await searchCommons(q); } catch (e) { console.log(`  [${p.n}] query "${q}" falhou: ${e.message}`); }
      if (results.length) { queryUsed = q; candidates.push(...results.slice(0, 2)); break; }
      await sleep(150);
    }
    const chosen = candidates.slice(0, 2);
    const files = [];
    for (let i = 0; i < chosen.length; i++) {
      const c = chosen[i];
      const ext = c.mime.includes('png') ? 'png' : c.mime.includes('webp') ? 'webp' : 'jpg';
      const file = `${p.n}-c${i + 1}.${ext}`;
      try {
        const size = await download(c.thumbUrl, path.join(RAW, file));
        files.push({ file, ...c, bytes: size });
        console.log(`[${p.n}] c${i + 1} ok "${c.title}" ${c.width}x${c.height} ${c.license} (${Math.round(size / 1024)}KB)`);
      } catch (e) {
        console.log(`[${p.n}] c${i + 1} download falhou: ${e.message}`);
      }
      await sleep(120);
    }
    meta.push({ ...p, queryUsed, files });
  } catch (e) {
    console.log(`[${p.n}] ERRO: ${e.message}`);
    meta.push({ ...p, error: e.message, files: [] });
  }
}
await fs.writeFile(path.join(ROOT, 'meta.json'), JSON.stringify(meta, null, 2));
console.log(`\nConcluído: ${meta.filter((m) => m.files.length).length}/${PRODUCTS.length} produtos com candidatos. Meta em meta.json`);
