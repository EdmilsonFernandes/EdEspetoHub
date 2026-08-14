# Referência SDD Janocaminho — base comum das skills `sdd-*`

Fonte única consultada por todas as skills `sdd-*`. Adaptada do processo Spec-Driven FITec
(POL-ENG-SDD-001) para a realidade do **Janocaminho**: projeto de uma pessoa (Edmilson) +
agente de IA (Claude Code) como engenharia. Sem Jira, sem Confluence, sem Qase, sem PMO —
a rastreabilidade vive no próprio repositório.

**Hierarquia:** `constitution.md` (raiz) prevalece sobre este arquivo, que prevalece sobre o
`CLAUDE.md` em assuntos de processo SDD. Em caso de conflito com regra de segurança do
`CLAUDE.md`/`.ai/agent-rules.md`, a mais restritiva vence.

**Papéis:** Edmilson acumula PO, Arquiteto, QA e Revisor. O agente é engenharia/IA: propõe,
executa e reporta — **nunca decide gate**.

---

## 1. Regras invioláveis (aplicam-se a TODAS as skills)

| # | Regra |
|---|---|
| R1 | **Especificação antes de código.** Nenhum código de produção sem `requirements.md` aprovado. |
| R2 | **A IA propõe, o Edmilson decide.** O agente NUNCA aprova gate, NUNCA marca DoR/DoD como cumprido, NUNCA registra aceite. |
| R3 | **Rastreabilidade ponta a ponta:** REQ-n → Tarefa Tn (`tasks.md`) → commit/PR (mensagem cita `REQ-n`/`Tn`) → evidência (teste automatizado ou registro no relatório de rastreabilidade). |
| R4 | **Fonte única da verdade.** Divergência entre código e spec volta à fase correspondente — nunca se improvisa no código. |
| R5 | **Sem segredos.** Nunca commitar `.env`, `backend/keys/`, `.pem`, `.jks`; nunca logar token, senha ou dado pessoal; nunca enviar credencial ao agente. |
| R6 | **Segurança/LGPD desde a spec (shift-left).** Impacto avaliado antes do design. Biometria facial (face-worker) é **dado sensível** (LGPD art. 5º, II) — tratamento mais estrito. |
| R7 | Todo artefato gerado por IA é versionado (commit + push) e passa pela mesma revisão humana do código. |

**Exceções** (não pule fase silenciosamente — registre): hotfix de produção → spec retroativa
assim que o incêndio apagar; PoC time-boxed rotulada como tal; mudança trivial → registro
simplificado (uma linha no commit). Aprovação da exceção é do Edmilson.

---

## 2. Fases, gates e artefatos

Fluxo: **Constituição → Especificação → Plano → Tarefas → Implementação → Verificação/Aceite**

| Gate | Fase | Entrada (DoR) | Saída (DoD) | Aprovador | Skill |
|---|---|---|---|---|---|
| — | 0 · Constituição | Projeto iniciado / adoção do SDD | `constitution.md` versionado | Edmilson | `sdd-constitution` |
| **G1** | 1 · Especificação | Intenção e escopo definidos | `specs/<feature>/requirements.md` aprovado | Edmilson (como PO) | `sdd-specify` |
| **G2** | 2 · Plano | Spec aprovada | `design.md` + `test_plan.md` aprovados | Edmilson (como Arquiteto) | `sdd-plan` |
| **G3** | 3 · Tarefas | Design aprovado | `tasks.md` revisado | Edmilson (revisão) | `sdd-tasks` |
| **G4** | 4 · Implementação | Tarefa pronta | Commit/PR com testes verdes e revisão humana | Edmilson (como Revisor) | `sdd-implement` |
| **G5** | 5 · Verificação/Aceite | Implementação concluída | Matriz REQ→evidência + aceite formal | Edmilson (como PO+QA) | `sdd-verify` |

Transversal: `sdd-security-req` — requisitos de segurança (5 campos) quando a triagem apontar impacto.

**Aprovação de gate** = o Edmilson diz "aprovado" (e o agente atualiza o campo *Status* do
artefato). O agente nunca se auto-aprova.

### Artefatos (Markdown, versionados no repositório)

```
constitution.md                 # raiz — princípios inegociáveis
specs/<feature>/requirements.md # requisitos EARS + RNF + segurança
specs/<feature>/design.md       # arquitetura, contratos, dados, testes, rollback
specs/<feature>/tasks.md        # tarefas atômicas rastreáveis (Tn)
specs/<feature>/test_plan.md    # REQ → caso de teste
specs/<feature>/rastreabilidade.md  # matriz de verificação (gerada no G5)
docs/adr/                       # decisões relevantes (opcional)
```

---

## 3. Rastreabilidade sem Jira

- **Tarefas** vivem em `specs/<feature>/tasks.md` com identificador estável `Tn` (T1, T2, …).
- **Commits** citam o que atendem: `feat(hub): seletor visual — REQ-3, T2` (convenção atual do
  repo é `tipo(escopo): descrição`; acrescente `— REQ-n, Tn` no trabalho SDD).
- **PR** quando a mudança for grande ou arriscada (migration, auth, regra de negócio); commit
  direto na main é aceitável para trabalho pequeno e já revisado no chat.
- **GitHub Issues são opcionais**: se quiser acompanhar no GitHub, crie issue por feature com a
  label `sdd` — via MCP GitHub, sempre mostrando o conteúdo e aguardando confirmação antes.
- **Evidência** = teste automatizado nomeado (comando real executado) ou validação manual
  registrada com data/resultado no `rastreabilidade.md`. Sem registro = sem cobertura.

---

## 4. Comandos de validação OBRIGATÓRIOS (antes de fechar qualquer fase com código)

| Mudança | Comando | Critério |
|---|---|---|
| Backend | `cd backend && yarn test` | 100% verde |
| Frontend | `cd frontend && npm run test:unit && npm run build` | verde + build ok (build, não só tsc — MenuView tem `@ts-nocheck`) |
| Migration | `cd backend && npm run migrate:status` | **0 pending** + `yarn test` |
| Mobile/AAB | `npm --prefix frontend run build && npm --prefix mobile run android:sync` | sync ok; versionCode +1 antes de AAB |

Regras fixas do projeto:
- **Migration:** criar `backend/src/migrations/YYYYMMDD_NNN_nome.ts`, registrar em
  `backend/src/migrations/index.ts`, atualizar `backend/schema.sql` +
  `backend/docs/database-schema.html`. **NUNCA editar migration já aplicada.**
- **E2E NUNCA contra o banco de produção.**
- **Deploy é SEMPRE do Edmilson** (deploy-production.yml com approval ou
  `scripts/deploy-release-*.sh`). O agente jamais deploya ou roda SSH de mudança.
- Pós-deploy: validar `SELECT COUNT(*) FROM users;` (0 = sem dump/seed).

---

## 5. Segurança específica do Janocaminho

Superfície real a considerar na triagem (não limitada a):

- **Dados pessoais (LGPD):** clientes (nome, telefone, endereço, histórico de pedidos),
  lojistas, motoboys. **Dado sensível:** biometria facial dos motoboys (face-worker) — nunca
  em log, nunca em massa de teste, minimização por padrão.
- **Pagamentos:** integração Mercado Pago (PIX, webhooks) — idempotência de webhook,
  never-trust-no-cliente em valores.
- **Autenticação/autorização:** JWT; perfis existentes (confirme no código: superadmin,
  admin/loja, cliente, motoboy); o frontend **NUNCA** fala direto com o backend — sempre BFF.
- **Uploads:** `/uploads/*` servidos pelo backend; nginx `client_max_body_size 20m`.
- **Push:** chaves Firebase em `backend/keys/` — fora do git.
- **Servidor:** SSH só leitura/diagnóstico pelo agente; erros de API aparecem nos logs como
  `Unhandled error returned to client`.

Vulnerabilidades críticas/altas bloqueiam a conclusão (DoD), salvo aceite formal de risco
registrar: justificativa, aprovador (Edmilson) e prazo de reavaliação.

---

## 6. Definition of Ready (checklist da feature)

```
[ ] Valor de negócio ou técnico descrito claramente
[ ] Histórias no formato "Como <persona>, quero <ação>, para <benefício>"
[ ] Escopo incluído E excluído explícitos
[ ] Critérios de aceite objetivos em EARS (REQ-n) — caminhos felizes, erros e bordas
[ ] RNF mensuráveis quando aplicável (performance, a11y, offline/mobile)
[ ] Mockup/protótipo quando houver UI (use as skills de UX: impeccable, prototype…)
[ ] Dependências técnicas identificadas (e gates de validação afetados: backend/frontend/migration/mobile)
[ ] Impacto de segurança avaliado (checklist da seção 5) — "sem impacto" registrado explicitamente
[ ] Plano de validação esboçado (REQ → como será testado)
```

## 7. Definition of Done (checklist da feature)

```
[ ] Todos os REQ cobertos por teste automatizado ou validação manual registrada
[ ] Comandos de validação da seção 4 executados com saída REAL reportada (verde)
[ ] Migration (se houver): status 0 pending + padrão MIGRATION_STANDARD seguido
[ ] Diff revisado pelo Edmilson (git diff) — sem PII/segredo/token em log ou código
[ ] Controles de segurança do design implementados (quando aplicável)
[ ] Dependabot/alertas de dependência avaliados (corrigidos ou aceitos formalmente)
[ ] Artefatos SDD atualizados se o entregue divergiu da spec (documentação viva)
[ ] CLAUDE.md/docs atualizados se o comportamento operacional mudou
[ ] Commit(s) com refs REQ-n/Tn; push feito
[ ] Deploy de produção: executado pelo Edmilson (agente nunca) — pós-deploy validado
[ ] Aceite formal do Edmilson registrado no artefato (Status: Aceito — data)
```

---

## 8. Notação EARS

```
QUANDO <condição/evento> O SISTEMA DEVE <comportamento esperado>
```

- Um comportamento verificável por requisito; sem "e/ou" encadeando comportamentos distintos.
- Sem detalhe de implementação (o *como* pertence ao `design.md`).
- Identificador `REQ-n` estável, único na feature, nunca reciclado.
- Caminhos negativos e de borda obrigatórios: entrada inválida, sem permissão, expiração,
  offline (mobile), dependência fora do ar (MP, Firebase, Redis).

---

## 9. Uso do MCP GitHub pelas skills

- **Ler** é livre: commits, PRs, issues, workflows (`list_commits`, `pull_request_read`,
  `list_issues`, `get_commit`…).
- **Escrever** (criar issue, abrir PR, comentar, merge): mostre o conteúdo exato e **aguarde
  confirmação explícita**. Merge/approval de PR só com pedido direto do Edmilson.
- Commit + push direto na main é o fluxo normal do repo — mantido, com refs `REQ-n`/`Tn`.

---

## 10. Métricas leves (opcional, para retro própria)

Cobertura REQ→teste · retrabalho pós-aceite · features que pularam gates (contar exceções) ·
lead time spec→produção. Ferramenta de melhoria pessoal — não cerimônia.
