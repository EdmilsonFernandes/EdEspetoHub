# Guia de Implementação: Portal Institucional da Empresa Já No Caminho

> **Documento de Instrução para IA / Desenvolvedor do projeto `EdEspetoHub`**  
> Este documento descreve o objetivo de negócio, a arquitetura de rotas, o diagnóstico de infraestrutura (Nginx/EC2) e as alterações no código necessárias para colocar no ar o site oficial da holding **Já No Caminho Tecnologia** (`www.janocaminho.com.br`).

---

## 1. Visão Geral e Contexto de Negócio

A empresa **Já No Caminho** evoluiu de um aplicativo de pedidos para uma **holding de tecnologia** com 3 plataformas ativas (e uma 4ª em desenvolvimento):

1. **Dr. Exame** (`https://drexame.janocaminho.com.br`)
   - Plataforma de inteligência médica, telelaudos e saúde preventiva.
2. **Já No Caminho (App)** (`https://app.janocaminho.com.br` / vitrine no `/hub`)
   - Hub de comércio local, condomínios, restaurantes e delivery de proximidade.
3. **Uai ID** (`https://uaiid.com.br`)
   - Plataforma de identidade digital, validação biométrica facial 3D, OCR forense de CNH/RG e KYC antifraude.
4. **Nova Solução (Em Breve)**
   - Produto adicional previsto para o ecossistema.

---

## 2. O Problema Identificado com `www.janocaminho.com.br`

### O que ocorria antes:
- O domínio `janocaminho.com.br` (sem `/hub`) exibia a landing page de apresentação do aplicativo consumidor (com QR code da Google Play, destinos, depoimentos, etc.).
- Dessa landing page, o usuário clicava para entrar no `/hub` (o marketplace de lojas e compras).

### O que está acontecendo agora (o bug/desvio):
- Ao acessar `janocaminho.com.br` ou `www.janocaminho.com.br`, o usuário é **redirecionado compulsoriamente direto para o `/hub`** (o app de compras), sem passar por nenhuma página institucional ou de apresentação.
- Isso ocorre ou por um **redirecionamento no Nginx da EC2** (`return 301 /hub;` ou `rewrite`) ou por regra de roteamento no frontend.

### O que deve acontecer a partir de agora:
1. `www.janocaminho.com.br` (Raiz `/`):
   - Deve ser o **Portal Institucional da Empresa Mãe (Já No Caminho Tecnologia)**.
   - Apresenta a empresa e os 3 produtos com padrão visual moderno (dark glassmorphism, estilo UAI-ID).
2. No card do **Já No Caminho (App)** no portal:
   - O botão **"Conhecer o App →"** leva para a rota `/app` (que é o site de apresentação do app).
   - O botão **"Abrir o Hub ↗"** leva para o marketplace de compras (`app.janocaminho.com.br/hub` ou `/hub`).
3. A landing page original do app ([LandingPage.tsx](frontend/src/pages/LandingPage.tsx)) **NÃO É APAGADA**; ela foi preservada na rota `/app` e `/conheca-o-app`.

---

## 3. Arquivos Já Criados e Prontos no Repositório

Os seguintes arquivos já foram gerados e adicionados ao repositório:

1. **`preview-janocaminho-empresa.html`** (na raiz do projeto):
   - Mockup HTML 100% funcional com os logos reais dos 3 produtos e visual dark mode. Pode ser aberto no navegador para conferência visual imediata.
2. **`frontend/src/pages/EmpresaJanoCaminhoPage.tsx`**:
   - Componente React completo para a rota `/`, com Framer Motion, layout responsivo, banner de ecossistema e links dedicados.
3. **`frontend/public/logos/`**:
   - `janocaminho.jpg` (logo Já No Caminho)
   - `janocaminho-logo.svg` (marca vetorial JNC)
   - `dr-exame.svg` e `dr-exame-brand.png` (logos Dr. Exame)
   - `logo-uai-full.svg` e `uai-logo.jpg` (logos Uai ID)

---

## 4. Alterações Realizadas no Roteamento (`frontend/src/App.tsx`)

No arquivo `frontend/src/App.tsx`:

```tsx
// 1. Importação Lazy da nova página da empresa mãe:
const EmpresaJanoCaminhoPage = lazyPage(() => import('./pages/EmpresaJanoCaminhoPage'), 'EmpresaJanoCaminhoPage');
const LandingPage = lazyPage(() => import('./pages/LandingPage'), 'LandingPage');

// 2. Mapeamento das Rotas:
<Routes>
  {/* Raiz agora é o portal da empresa mãe */}
  <Route path="/" element={<EmpresaJanoCaminhoPage />} />

  {/* A apresentação original do app agora vive em /app e /conheca-o-app */}
  <Route path="/app" element={<LandingPage />} />
  <Route path="/conheca-o-app" element={<LandingPage />} />

  {/* O marketplace de pedidos permanece intacto em /hub */}
  <Route path="/hub" element={<MarketplacePage />} />
  ...
</Routes>
```

---

## 5. Diagnóstico da EC2 / Nginx (Para Resolver o Redirecionamento Forçado)

Se mesmo com as rotas atualizadas no React, ao acessar `https://www.janocaminho.com.br/` o navegador for forçado para `/hub`, o redirecionamento está no **Nginx do servidor de produção**.

### Como acessar o servidor via SSH:
```bash
# Host EC2 (us-east-2):
ssh -i "medtrack-temp.pem" ec2-user@ec2-3-137-119-152.us-east-2.compute.amazonaws.com
```

### O que verificar no Nginx:
1. Abra o arquivo de configuração do Nginx:
   ```bash
   sudo nano /etc/nginx/conf.d/janocaminho.conf
   # ou /etc/nginx/nginx.conf
   ```
2. Procure por blocos como:
   ```nginx
   # SE EXISTIR ISSO, REMOVER OU COMENTAR:
   location = / {
       return 301 https://app.janocaminho.com.br/hub;
       # ou rewrite ^/$ /hub permanent;
   }
   ```
3. O Nginx deve simplesmente repassar a raiz para o container do frontend:
   ```nginx
   location / {
       proxy_pass http://localhost:8080;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```
4. Testar e recarregar o Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 6. Como Validar Localmente

Para rodar e testar o frontend no ambiente de desenvolvimento:
```bash
cd frontend
npm run dev
```

1. Acesse `http://localhost:5173/` ➔ Deve abrir o portal da **empresa Já No Caminho** com os cards dos 3 produtos e logos oficiais.
2. Clique em **"Conhecer o App →"** ➔ Deve abrir `http://localhost:5173/app` com a landing completa do app de delivery e condomínios.
3. Clique em **"Abrir o Hub ↗"** ➔ Deve abrir o marketplace de pedidos.

---

## 7. Como Fazer o Deploy para Produção

Após commitar e dar push na branch `main`:
1. O GitHub Actions rodará o build e publicará a imagem no GHCR.
2. Execute o script de release do frontend no servidor ou aprove o pipeline:
   ```bash
   # No EC2:
   cd ~/EdEspetoHub
   git pull
   scripts/deploy-release-frontend.sh
   ```
