# Constituição do Projeto — Janocaminho (Já no Caminho)

> Documento normativo do projeto. Aprovação: Edmilson.
> Base: `.ai/sdd/referencia-janocaminho.md` (processo SDD adaptado — sem Jira/PMO).
> Versão: 1.0 · Data: 2026-08-28 · **Status: Aprovado — Fase 0 fechada em 2026-08-28 (Edmilson)**

## 1. Identificação

| Item | Valor |
|---|---|
| Produto | Janocaminho / Já no Caminho (hub de delivery + vitrines) |
| Repositório GitHub | EdmilsonFernandes/EdEspetoHub |
| Site de produção | https://janocaminho.com.br/hub |
| Dono (PO + Arquiteto + QA) | Edmilson |
| Engenharia | Agente de IA (Claude Code) — propõe, executa e reporta; nunca decide gate |
| Classificação da informação | Dados pessoais de clientes/lojistas/motoboys + biometria facial (sensível LGPD) |

## 2. Princípios (inegociáveis)

1. **Especificação antes de código.** Nenhum código de produção sem
   `specs/<feature>/requirements.md` aprovado.
2. **Fonte única da verdade.** A spec versionada prevalece sobre entendimentos verbais;
   divergências voltam à spec, não são resolvidas no código.
3. **Rastreabilidade ponta a ponta.** REQ-n → Tarefa Tn (`tasks.md`) → commit/PR (refs na
   mensagem) → evidência (teste automatizado ou registro no `rastreabilidade.md`).
4. **Requisitos testáveis.** Critérios objetivos em EARS
   (`QUANDO <condição> O SISTEMA DEVE <comportamento>`).
5. **Humano no comando.** A IA propõe; decisão, revisão e responsabilidade são do Edmilson.
   Nenhum agente aprova gate ou registra aceite.
6. **Iteração com revisão.** Cada fase é refinada e revisada antes de avançar (gates G1–G5).
7. **Segurança e LGPD por padrão.** Requisitos de segurança/privacidade explícitos desde a
   especificação (shift-left). Biometria facial = dado sensível (art. 5º, II).
8. **Entregas pequenas.** Uma tarefa = um commit/PR revisável; validação verde antes de
   commit; sem escopo extra "de aproveitamento".

## 3. Stack e padrões (verificados no repositório em 2026-08-28)

- **Frontend:** React 19 + Vite 6 + TypeScript 5.7 + Tailwind CSS 4 (porta 8080)
- **Backend:** Express 4 + TypeORM 0.3 + PostgreSQL 16 + Redis 7 (porta 4000)
- **BFF (apis):** Express 4 — proxy frontend↔backend (porta 5000). **Frontend nunca fala
  direto com o backend.**
- **Face Worker:** Python FastAPI — verificação facial de motoboys (porta 8000)
- **Mobile:** Capacitor 7, appId `com.janocaminho.app`, server URL `https://janocaminho.com.br/hub`
- **Push:** Firebase (`ja-no-caminho-mobile`), chaves em `backend/keys/` (fora do git)
- **Containers:** `janocaminho-{frontend,apis,backend,postgres,redis,pgadmin,face-worker}`
- **Deploy:** push na main → GHCR; `deploy-production.yml` (com approval) — **sempre pelo
  Edmilson**. Pós-deploy: `SELECT COUNT(*) FROM users;`
- **Validação obrigatória:** backend `yarn test` (100% verde — unit + integração) **e**
  `npm run build` (tsc; vitest não typechecka) · frontend `npm run test:unit && npm run
  build` · migration `npm run migrate:status` (0 pending) · mobile build + cap sync ·
  **E2E nunca contra produção**
- **Migrations:** padrão `backend/docs/MIGRATION_STANDARD.md`; nunca editar migration aplicada
- **Commits:** `tipo(escopo): descrição` (+ `— REQ-n, Tn` em trabalho SDD); push ao concluir
- **Granularidade:** tarefa que cabe em um commit/PR revisável

## 4. Segurança e proteção de dados

- Requisitos de segurança pelo método da skill `sdd-security-req` (5 campos: autenticação,
  controle de acesso, auditoria/logs, validação de entrada/saída, criptografia).
- Segredos, credenciais e chaves **nunca** em código ou arquivo versionado (`.env`,
  `backend/keys/`, `.pem`, `.jks`).
- Dados pessoais e sensíveis (incluindo biometria facial): nunca em massa de teste sem
  anonimização; nunca em logs ou mensagens de erro.
- Vulnerabilidades críticas/altas bloqueiam a DoD, salvo aceite formal de risco registrado
  (justificativa + aprovador + prazo).
- Dados sensíveis não são submetidos a serviços externos sem autorização.

## 5. Exceções

Hotfix de produção → spec retroativa assim que resolvido; PoC time-boxed rotulada; mudança
trivial → registro simplificado no commit. Todas registradas e aprovadas pelo Edmilson.

## 6. Revisão

Revisar a cada mudança material de stack, arquitetura ou processo. Em divergência: esta
constituição prevalece sobre `.ai/sdd/referencia-janocaminho.md`, que prevalece sobre o
`CLAUDE.md` em assunto de processo SDD; em regra de segurança, a mais restritiva vence.
