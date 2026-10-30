# Kit de cadastro de fotos de produtos (por loja)

Pipeline validado em 30/10/2026 (EC Ponto da Fruta, 34/34 produtos). Preenche **somente**
`products.image_url` vazio, sem tocar preços/estoque/descrição. Idempotente: re-rodar pula
quem já tem foto.

Exemplo completo de uso real: `.ux-audit/product-photos-ec-fruta/` (config, metadados,
relatório de licenças e screenshots da sessão original).

## Fluxo (7 passos)

### 1+2. Levantar loja e produtos sem foto (script — cria estrutura + config.json)

```bash
node scripts/product-photos/bootstrap-config.mjs "<nome ou slug da loja>" .ux-audit/product-photos-<loja>
# opções: --key CAMINHO --host HOST (default = EC2 janocaminho) | --todos (inclui quem já tem foto)
```

Cria `raw/ final/ _scripts/ shots/` e um `config.json` inicial com os produtos sem foto e
queries sugeridas a partir do nome. **Revise as queries** — a sugestão é ponto de partida.

`config.json` (ver `config.example.json`): `{ storeId, storeSlug, storeName, products: [{id, name, queries[], must?, cat?, include?, exclude?, note?}] }`
- `queries`: termos de busca no Commons (PT primeiro, EN como fallback)
- `must`: regex que o título do arquivo precisa casar (mata resultados absurdos)
- `cat/include/exclude`: modo categoria (use quando a busca falhar — ex.: batata, maracujá)

### 3. Buscar candidatos

```bash
node scripts/product-photos/fetch-candidates.mjs .ux-audit/product-photos-<loja>/config.json
```

Baixa até 2 candidatos por produto em `raw/` e grava `meta.json` (título, licença, autor,
página de origem). Se um produto vier sem candidato ou com candidato ruim, ajuste as
`queries`/`must` e rode de novo (só os ausentes são re-buscados se você remover o arquivo).

### 4. Validar visualmente (obrigatório)

Cada foto precisa ser vista antes de subir — corresponde à variedade/preparo (banana prata ≠
nanica; uva Thompson verde ≠ Vitória roxa; espetinho assado, não cru), sem marca, texto,
preço, marca-d'água, mão ou rosto. Quem valida é o agente (visão) lendo `raw/*.jpg` e
conferindo; reprovações voltam ao passo 3 com outras queries. Aproximações aceitas devem
ganhar `note` no mapping (ex.: "espeto de frango (aproximação)").

### 5. Padronizar em WebP 800×800

```bash
node scripts/product-photos/process.mjs .ux-audit/product-photos-<loja> raw/arquivo1.jpg raw/arquivo2.jpg
```

Usa o sharp do `backend/node_modules`. Contain (produto inteiro), fundo branco, q82.

### 6. Montar `mapping.json` e subir

`mapping.json` = um item por produto: `{productId, name, file: "<nome>.webp", rawFile,
source: "Wikimedia Commons", title, license, sourceUrl, artist, note?}` (metadados vêm do
`meta.json` — ver exemplo em `.ux-audit/product-photos-ec-fruta/mapping.json`).

```bash
node scripts/product-photos/make-payload.mjs .ux-audit/product-photos-<loja>/mapping.json \
  .ux-audit/product-photos-<loja>/_scripts/payload.js

node scripts/product-photos/upload-store.mjs .ux-audit/product-photos-<loja>/_scripts/payload.js
```

O payload injetado roda DENTRO do container backend: `loadSsmEnv()` →
`saveBase64Image(..., 'products')` (upload S3 + local, mesmo fluxo do painel) →
`UPDATE products SET image_url=$1 WHERE id=$2 AND (image_url IS NULL OR image_url='')`.
Nunca sobrescreve foto existente.

### 7. Verificar (não declarar sucesso sem isto)

```bash
# API pública: tem que sobrar 0 sem imagem
curl -s "https://janocaminho.com.br/api/public/stores/slug/<slug>/products" | node -e \
  "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const a=JSON.parse(d);console.log('sem imagem:',a.filter(p=>!p.imageUrl).length,'/',a.length)})"

# HEAD de cada URL (200 + image/*)
# Screenshot mobile da vitrine (rota /:storeSlug)
node scripts/product-photos/shot.cjs <slug> .ux-audit/product-photos-<loja>/shots
```

## Registro de licenças

Ao terminar, gerar `RELATORIO.md` na pasta da loja (produto | arquivo Commons | licença |
autor | obs). CC BY/CC BY-SA exigem crédito — o registro fica no repo. Preferir CC0 quando
houver. Nunca salvar link externo no banco: a cópia no S3 é a fonte.

## Gotchas da sessão original

- Chave SSH real: `D:\PESSOAL\PESSOAL\chamanoespeto-aws\medtrack-system.pem` (a doc antiga
  aponta um nível a menos de pasta).
- A busca do Commons erra feio sem `must` (trouxe "Woodrow Wilson" para manga Tommy).
- Categorias salvam batata/maracujá quando a busca só acha broto/flor/prato.
- Openverse estava 504 — não conte com ele.
- `git push` pode resetar conexão na 443 (transitório) — retry resolve.
