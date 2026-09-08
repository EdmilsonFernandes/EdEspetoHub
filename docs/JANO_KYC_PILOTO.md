# Piloto KYC Uai ID — implementação, arquitetura e funcionamento

> **Para IA/desenvolvedor abrindo este projeto:** este documento explica toda a integração do KYC **Uai ID** no EdEspetoHub (verificação de identidade de motoboy). Leia antes de mexer em qualquer arquivo citado aqui. Plataforma Uai ID (código-fonte): `C:\Users\esantos\projeto-pessoal\kyc-janocaminho`.

## 1. O que é

O EdEspetoHub usa a **Uai ID** (plataforma própria de KYC-as-a-Service) para verificar a identidade dos motoboys: **documento + selfie + prova de vida (liveness)**, com decisão automática e **score de confiança (0–1000)**. Quando aprovado, o cadastro do motoboy **ativa sozinho** (sem revisão manual no painel Super Admin).

A captura é **hospedada pelo provedor Didit** (workflow "Free KYC", US$0 até 500 verificações/mês): a Uai ID cria a sessão e devolve uma URL pronta (`verify.didit.me`, em português) — não construímos câmera/liveness no app.

## 2. Arquitetura

```
App (frontend PWA / Capacitor)
  └─ MotoboyProfile → card "Verificação rápida de identidade"
        │  POST /api/motoboy/kyc/jano/start   (JWT do motoboy)
        ▼
Backend EdEspetoHub (:4000, container janocaminho-backend)
  └─ JanoKycService.start()
        │  POST {JANO_API_BASE_URL}/v1/verifications  (API key da Uai ID — SÓ no backend)
        ▼
Plataforma Uai ID (:8000, local: uvicorn no host — repo kyc-janocaminho)
  └─ cria sessão no Didit (verification.didit.me/v3/session/, header x-api-key)
        │  devolve provider_url (tela de captura hospedada, pt-BR)
        ▼
Motoboy faz a captura (doc + selfie + liveness) na URL do Didit
  (desktop: QR code pro celular · app: Browser.open = navegador interno)
        │
        │  terminou → toca "Já concluí a captura — verificar"
        │  POST /api/motoboy/kyc/jano/check
        │  → JanoKycService.check() → POST /v1/verifications/{id}/finalize
        │  → pipeline Uai ID: busca decisão no Didit → score → dispara webhook
        ▼
Webhook da Uai ID → POST {backend}/api/webhooks/jano
  (HMAC-SHA256 no header X-Uai-Signature: t=<ts>,v1=<hmac de `${ts}.${rawBody}`>)
  └─ JanoKycService.handleWebhook():
       approved      → documento KYC_JANO = APPROVED + motoboy.status = ACTIVE
       rejected      → documento REJECTED
       manual_review → fica PENDING (cai no painel Super Admin como fallback humano)
       score gravado em metadata.face (formato que o frontend já renderiza)
```

**Portas locais:** Uai ID API `:8000` · dashboard Uai ID `:3000` (Next.js) · Postgres/S3 da Uai ID `:5434`/`:9000` (docker, repo kyc-janocaminho) · EdEspetoHub backend `:4000` · frontend `:8080` (nginx) · Postgres do hub `:5432` (container `janocaminho-postgres`, db `espetinho`).

**Atenção container→host:** o backend roda em container; para alcançar a Uai ID no host usa `host.docker.internal:8000` (não `localhost`). O webhook inverso funciona porque a Uai ID (no host) posta em `localhost:4000` (porta publicada).

## 3. Fluxo de dados e estados

1. **start** → cria `motoboy_documents` com `doc_type='KYC_JANO'`, `status='PENDING'`, `metadata.jano = {verificationId, captureUrl, status}` e `file_key='jano:hosted'`.
2. **Vínculo de identidade**: no primeiro KYC, CPF (11 dígitos) e nascimento (DDMMAAAA) são gravados em `motoboys.kyc_cpf` / `kyc_birth_date`. **Verificações seguintes usam SEMPRE os valores gravados** (campos ficam travados no frontend) — impede verificar com a identidade de outra pessoa.
3. **finalize/check** → a Uai ID busca a decisão no Didit; enquanto o usuário não conclui, retorna `processing` (`reason_code=awaiting_provider`).
4. **webhook** → atualiza documento + ativa motoboy. `metadata.face = {status, scoreLabel, score}` com labels `alto|medio|baixo` (mesmos thresholds do FaceVerifyService: ≥0,75 / ≥0,55) — o banner/card do frontend lê esse formato.
5. Score (na Uai ID): `verification +500` (face ≥0,80) · `senatran_face +200` (base oficial, requer gov-lookup pago) · `cpf_regular +100` · `reuse_history ≤+150` · `identity_age ≤+50`. Sem gov-lookup o score típico é ~500.

## 4. Mapa dos arquivos

### Backend (`backend/src/`)

| Arquivo | Papel |
|---|---|
| `services/JanoKycService.ts` | **coração da integração**: `start()` (cria verificação + doc + vínculo CPF), `check()` (finaliza), `handleWebhook()` (valida HMAC + aplica decisão) |
| `controllers/JanoController.ts` | `webhook` (sem auth — segurança é o HMAC) |
| `controllers/MotoboyController.ts` | `startJanoKyc` e `checkJanoKyc` (JWT do motoboy) |
| `routes/index.ts` | `POST /motoboy/kyc/jano/start` · `POST /motoboy/kyc/jano/check` · `POST /webhooks/jano` |
| `config/env.ts` | bloco `jano` (enabled/apiBaseUrl/apiKey/webhookSecret) |
| `entities/Motoboy.ts` | `kycCpf`, `kycBirthDate` |
| `utils/runMigrations.ts` | `ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS kyc_cpf / kyc_birth_date` |
| `app.ts` | `express.json({verify})` captura `rawBody` (obrigatório pro HMAC dos bytes exatos) |

### Frontend (`frontend/src/`)

| Arquivo | Papel |
|---|---|
| `pages/MotoboyProfile.tsx` | card "Verificação rápida de identidade" na aba Documentos (form CPF/nascimento → `Browser.open(captureUrl)` → botão verificar) |
| `services/motoboyService.ts` | `startJanoKyc()`, `checkJanoKyc()` |

### Infra

| Arquivo | Papel |
|---|---|
| `frontend/nginx.conf` | `/api/motoboy/` e `/api/webhooks/jano` vão **direto ao backend:4000** (bypass do BFF `apis`, mesmo padrão de `/uploads/`) — sem isso dá 404 |
| `backend/.env.docker` / `.env.test` | credenciais da Uai ID (ver §5) |

## 5. Variáveis de ambiente

```
JANO_KYC_ENABLED=true
JANO_API_BASE_URL=http://host.docker.internal:8000   # container→host. Local dev no host: http://localhost:8000
JANO_API_KEY=jano_live_...                            # tenant "EdEspetoHub (piloto)" — NUNCA no app
JANO_WEBHOOK_SECRET=whsec_...                         # segredo do webhook (mesmo valor cadastrado na Uai ID)
```

## 6. Decisões tomadas (por que é assim)

1. **Captura hospedada (Didit) em vez de câmera própria** — o workflow Free KYC custa US$0 (500/mês) e já traz doc+liveness+face em pt-BR. A captura própria (com ML Kit) existe no app Flutter da Uai ID (`kyc-janocaminho/platform/mobile`) para a fase de motor próprio.
2. **`expected_details` DESLIGADO na Uai ID** — conferência de nome/nascimento na captura mandava usuário legítimo pra revisão quando o dado do tenant estava desatualizado. O vínculo correto é o CPF gravado no motoboy (feito aqui).
3. **`finalize` acionado pelo tenant (check)** em vez de webhook do Didit — webhook do provedor exige URL pública; ainda não temos deploy. Quando houver, configurar webhook do Didit na etapa 3 do wizard e o check vira redundância.
4. **HMAC sobre rawBody** — `JSON.stringify` não reproduz os bytes (escapes unicode); por isso o `verify` no express.json.
5. **manual_review fica PENDING** — zona cinzenta vai pro painel Super Admin existente (fallback humano), não reprova automático (enviesamento).
6. **Esteira própria (face-worker) não foi desligada** — apenas parada por memória; pode voltar como segunda opinião. `FACE_VERIFY_ENABLED=false` a desativa.

## 7. Como testar localmente

```powershell
# 1. Uai ID (repo kyc-janocaminho/platform/api)
docker compose up -d db minio minio-init
uv run uvicorn app.main:app --port 8000
#    (dashboard da Uai ID, opcional: cd ../web ; npm run dev → :3000)

# 2. EdEspetoHub (raiz deste repo)
docker compose up -d          # backend :4000, frontend :8080, postgres, redis

# 3. Testar: http://localhost:8080/hub → login motoboy → Perfil → Documentos
#    → card roxo → CPF + nascimento → Iniciar verificação → captura → "Já concluí"
```

Conta de teste: `chamanoespetoadmin@teste.com` (motoboy `PENDING_VERIFICATION`). API key do dashboard da Uai ID está no `.env.docker`.

## 8. Problemas conhecidos / limitações do piloto

- **Máquina local com RAM cheia** mata a Uai ID API/dashboard (não são containers ainda). Medir antes de subir tudo; o stack do hub em container resiste melhor.
- **Webhook do Didit não configurado** (precisa URL pública → deploy). Hoje o resultado chega via botão "check".
- **Gov-lookup (base oficial RFB/Senatran) desativado por falta de crédito** — score fica ~500. Com ~US$20 de crédito no Didit (`bra_cpf_facial` US$0,45/verificação) sobe pra ~800.
- Imagens da captura ficam **no Didit** (URLs temporárias); o detalhe no dashboard da Uai ID as busca ao vivo.

## 9. Próximos passos planejados

1. **Deploy** da Uai ID (cloud) — resolve webhook do Didit, memória local e libera venda.
2. Crédito no Didit → ativar gov-lookup (score completo).
3. Revalidação rápida (rede/score ≥ 700) no app do motoboy.
4. Fase 2: motor próprio de OCR/face (o `face-worker` deste repo já usa InsightFace buffalo_l — mesma eleição da pesquisa da Uai ID) assumindo por trás dos adapters, sem mudar esta integração.

Documentação completa da plataforma Uai ID: `kyc-janocaminho/docs/` (índice no `docs/README.md`; guia do cliente no `docs/08`).

> **Nota de rebrand:** o produto chama-se **Uai ID** (desde 08/09/2026). Os nomes internos do código (`JanoKycService`, rotas `/kyc/jano`, envs `JANO_*`, doc `KYC_JANO`, header `X-Uai-Signature`) são históricos e **continuam válidos** — renomear código é opcional e não quebra nada.
