// Consolida o mapping final: produto -> arquivo aprovado + metadados de licença.
import fs from 'node:fs/promises';

const ROOT = 'C:/Users/esantos/projeto-pessoal/EdEspetoHub/.ux-audit/product-photos-ec-fruta';
const meta = {
  r1: JSON.parse(await fs.readFile(`${ROOT}/meta.json`, 'utf8')),
  r2: JSON.parse(await fs.readFile(`${ROOT}/meta-round2.json`, 'utf8')),
  r3: JSON.parse(await fs.readFile(`${ROOT}/meta-round3.json`, 'utf8')),
  r5: JSON.parse(await fs.readFile(`${ROOT}/meta-round5.json`, 'utf8')),
  r6: JSON.parse(await fs.readFile(`${ROOT}/meta-round6.json`, 'utf8')),
  r7: JSON.parse(await fs.readFile(`${ROOT}/meta-round7.json`, 'utf8')),
  r8: JSON.parse(await fs.readFile(`${ROOT}/meta-round8.json`, 'utf8')),
  r9: JSON.parse(await fs.readFile(`${ROOT}/meta-round9.json`, 'utf8')),
};

function find(round, productN, file) {
  const group = meta[round].find((g) => g.n === productN);
  if (group?.files) {
    const f = group.files.find((x) => x.file === file || x.file === file.replace('.webp', '.jpg'));
    if (f) return f;
  }
  // rodada 5 re-download guarda sem o sufixo do produto no 'n'
  const alt = meta[round].find((g) => g.files?.some((x) => x.file === file));
  return alt?.files?.find((x) => x.file === file);
}

// [produtoId, nome, arquivo raw, rodada meta, nota?]
const CHOICES = [
  ['ee2aedf9-dd0e-4af1-ab73-53a35c363967', 'Espetinho de Carne', '01-espetinho-carne-c1.jpg', 'r1'],
  ['a9b944d9-f2ec-4ebf-963c-e8711ba49a2d', 'Espetinho de Frango', '02-espetinho-frango-r2.jpg', 'r2'],
  ['0cf3f91c-6615-4dda-bda3-ff6afe7d65cf', 'Espetinho Misto', '03-espetinho-misto-z1.jpg', 'r7', 'schaschlik (espetos mistos grelhados com fritas ao lado)'],
  ['8523f3a5-64c2-4286-ada4-86ed06deaccb', 'Medalhão de Frango', '04-medalhao-frango-k1.jpg', 'r9', 'espeto de frango grelhado (aproximação)'],
  ['101e08b5-d265-4add-b215-de7d9be6df2d', 'Abacate (kg)', '05-abacate-c2.jpg', 'r1'],
  ['0a032f05-1e61-4e6f-8c8e-59fea45108d3', 'Banana Nanica (kg)', '06-banana-nanica-c2.jpg', 'r1'],
  ['12f9d457-f20b-4216-a690-e975390389ca', 'Banana Prata (kg)', '07-banana-prata-r1.jpg', 'r2'],
  ['5b1ea75a-032c-4387-b4e0-b14de7df63fa', 'Laranja Pera (kg)', '08-laranja-pera-c1.jpg', 'r1'],
  ['594f4b46-52fe-4104-8bf0-8cd871f459c6', 'Maçã Gala (kg)', '09-maca-gala-r2.jpg', 'r2'],
  ['82860813-0954-44d6-95ec-2e4057744cc7', 'Maçã Verde (kg)', '10-maca-verde-c1.jpg', 'r1'],
  ['4b494405-d9c6-4284-9245-641ef7d42d22', 'Mamão Formosa (kg)', '11-mamao-formosa-r1.jpg', 'r2'],
  ['58f49de0-c1d4-4e8a-ada6-fac43647095c', 'Manga Palmer (kg)', '12-manga-palmer-r2.jpg', 'r2', 'manga Tommy Atkins (visual equivalente vermelho)'],
  ['a4933e57-3316-4f3d-8337-35e57957c4e4', 'Manga Tomy (kg)', '13-manga-tomy-r1.jpg', 'r2'],
  ['1e7de8e2-ca2c-44ed-8459-7d3f76f848c6', 'Maracujá (kg)', '14-maracuja-k2.jpg', 'r8'],
  ['083e32e4-f762-4df5-8280-0b3c75169ebc', 'Melão (kg)', '15-melao-x1.jpg', 'r5'],
  ['1133b1d2-69a0-4c68-a475-9cd47de56c96', 'Uva Thompson (Unidade)', '16-uva-thompson-r1.jpg', 'r2'],
  ['23da1e09-7a3e-4d53-9ef4-c4222cb0deb6', 'Uva Vitória (Unidade)', '17-uva-vitoria-c1.jpg', 'r1'],
  ['e2dda249-f145-4e89-a7aa-54927aa64a36', 'Abóbora Cabotiá (kg)', '18-abobora-cabotia-r1.jpg', 'r2', 'cesta com variedades; kabocha verde visível'],
  ['4b06944b-ff01-440d-9d7c-92822e3e5a93', 'Abobrinha (kg)', '19-abobrinha-c1.jpg', 'r1'],
  ['13eea7ba-f740-4fc7-92f7-ed7638cb9ef1', 'Alho (kg)', '20-alho-c2.jpg', 'r1'],
  ['22ad3e1a-9e9a-43d1-a800-ca855bb18582', 'Batata (kg)', '21-batata-k1.jpg', 'r8'],
  ['5efeb754-53bc-4036-83f4-796640eb08c3', 'Batata-doce (kg)', '22-batata-doce-r1.jpg', 'r2'],
  ['d74bfe55-88ab-4be8-97b4-03bc0165847c', 'Beterraba (kg)', '23-beterraba-c2.jpg', 'r1'],
  ['fa0d39fe-d84c-4114-b438-7eec95bf8037', 'Cebola (kg)', '24-cebola-c1.jpg', 'r1'],
  ['69845a88-5ca3-48db-9994-687037ee293c', 'Cebola Roxa (kg)', '25-cebola-roxa-r2.jpg', 'r2'],
  ['0fea4514-9124-44ec-b518-90398927016a', 'Cenoura (kg)', '26-cenoura-r2.jpg', 'r2'],
  ['72f454b6-d9a9-4f60-af41-b28805effd2c', 'Chuchu (kg)', '27-chuchu-r1.jpg', 'r2'],
  ['d134c11e-f7f3-4d85-84c2-d4b0df1c3a13', 'Inhame (kg)', '28-inhame-c1.jpg', 'r1'],
  ['4a259ff4-2c0e-4b4b-be98-309de576736f', 'Pepino (kg)', '29-pepino-c1.jpg', 'r1'],
  ['bc52146b-fee1-42f8-b843-4e46b1e0efc9', 'Tomate (kg)', '30-tomate-y1.jpg', 'r6'],
  ['9fedcf67-ca56-4781-a3c7-7d0b42ca4cf9', 'Jantinha com Espetinho', '04-medalhao-frango-y1.jpg', 'r6', 'prato feito CC0 (arroz, feijão, frango grelhado, fritas, salada, ovo)'],
  ['59d58d49-06f0-42d3-b762-e9200e2ac7f3', 'Alho Descascado (Pote 500g)', '32-alho-descascado-r1.jpg', 'r2'],
  ['42622c80-500a-439c-8002-5bdfd89def54', 'Alface Americana (Unidade)', '33-alface-americana-c2.jpg', 'r1'],
  ['88a02fb3-3b0b-4851-849f-96d6caed9bd4', 'Alface Crespa (Unidade)', '34-alface-crespa-c1.jpg', 'r1'],
];

const mapping = [];
const problems = [];
for (const [productId, name, file, round, note] of CHOICES) {
  const f = find(round, file.split('-').slice(0, 2).join('-') + '-' + file.split('-').slice(2).join('-'), file);
  const src = f || Object.values(meta).flat().flatMap((g) => g.files || []).find((x) => x.file === file);
  if (!src) { problems.push(`${name}: metadados não achados para ${file}`); continue; }
  mapping.push({
    productId, name,
    file: file.replace(/\.(jpe?g|png)$/i, '.webp'),
    rawFile: file,
    source: 'Wikimedia Commons',
    title: src.title, license: src.license || 'unknown',
    sourceUrl: src.pageUrl || '', artist: src.artist || 'unknown',
    ...(note ? { note } : {}),
  });
}
await fs.writeFile(`${ROOT}/mapping.json`, JSON.stringify(mapping, null, 2));
console.log(`mapping.json: ${mapping.length} produtos`);
for (const p of problems) console.log('PROBLEMA:', p);
for (const m of mapping) console.log(` ${m.name} <- ${m.rawFile} [${m.license}]${m.note ? ' *' + m.note : ''}`);
