# Claude Dev Platform — Playbook (v1)

> Como organizar o setup Claude Code de qualquer projeto: quem manda em quem,
> onde mora cada coisa, e como replicar. Baseado no diagnóstico real do
> EdEspetoHub (ver `DIAGNOSTICO-EDESPEOTOHUB.md`) e na arquitetura abaixo.

## 1. A arquitetura (quem manda em quem)

```
                  VOCÊ
                    │
              CLAUDE CODE
                    │
              ORCHESTRATOR          ← agente-mestre: triagem + delegação
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
   AGENTS          GSD         SKILLS
   (quem executa)  (planejamento,  (como executar)
                   estado, roadmap)
      │             │
      └──────┬──────┘
             ▼
            MCP               ← ferramentas externas, sob demanda
      (github, serena, playwright, context7, DBs)
             │
             ▼
          MEMÓRIA (4 níveis)
      L0 sessão · L1 projeto/STATE · L2 ADRs · L3 global
```

**Uma responsabilidade por peça.** Quando duas peças fazem a mesma coisa, uma
está sobrando — e hoje é isso que acontece num setup que cresceu sem arquitetura.

## 2. Doutrina: Agent × Skill × MCP × Memória

| Peça | É | Não é | Exemplo |
|---|---|---|---|
| **Agent** | QUEM executa (especialista com contexto próprio) | uma capacidade | `backend.md`, `frontend.md`, `qa.md` |
| **Skill** | COMO executar (procedimento carregável) | uma pessoa | `playwright-visual-qa`, `sdd-specify`, `impeccable` |
| **MCP** | Ferramenta externa (toca o mundo) | conhecimento | github, serena, postgres, playwright |
| **Memória** | Onde mora a informação (por prazo) | regra de execução | STATE.md, ADRs, CLAUDE.md global |
| **Rule** | Restrição sempre-válida | dica opcional | "nunca criar antes de descobrir" |

Regra de ouro: **o agente deve saber carregar a skill necessária** — você nunca
escolhe a skill na mão; você fala com o orquestrador, ele sabe o que o
especialista usa. E MCP se consulta **só quando necessário**, nunca
"antes de tudo consulte 15 MCPs".

## 3. Agents: 8–12 fortes, não 40 genéricos

`.claude/agents/` (global em `~/.claude/agents/`):

```
orchestrator.md   ← o mais importante (template em templates/orchestrator.md)
architect.md      backend.md        frontend.md       database.md
product-designer.md  qa.md          security.md       performance.md
researcher.md     code-reviewer.md  devops.md
```

Anti-padrão real medido: ter `frontend-agent`, `frontend-expert`, `react-expert`,
`frontend-master`, `frontend-ui` — 7 pessoas pro mesmo trabalho. No skills é o
mesmo pecado: `impeccable` + `design-taste-frontend` + `high-end-visual-design`
+ `gpt-taste` + `stitch-design-taste` + `frontend-design` + `redesign-existing-projects`
— escolha UM canal principal por capacidade e arquive o resto.

## 4. Skills: capacidades, não pessoas

- Skill genérica (serve a qualquer projeto) → **global** (`~/.claude/skills/`).
- Skill do domínio (SDD do Janocaminho, graphify com hooks do repo) → **local** (`.claude/skills/`).
- Toda skill nova entra no índice do `CLAUDE.md` da camada certa — skill órfã
  (fora do índice) é skill morta.
- Formato: pasta `nome/SKILL.md` (arquivos .md soltos são legado; migrar ao tocar).

## 5. GSD = camada oficial de planejamento

GSD (Get Shit Done) vira o **gerente**: planejamento, estado, roadmap e
execução pesada em subagentes (contexto novo = menos context rot).

Bootstrap num projeto novo (ou desorganizado):

```
/gsd:map-codebase     → STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS,
                        TESTING, INTEGRATIONS, CONCERNS (.planning/codebase/)
```

Depois: `PROJECT.md`, `ROADMAP.md`, `STATE.md`. O **STATE.md é a memória mais
útil do sistema** — "onde paramos?" respondido em 20 linhas (template em
`templates/STATE.md`). Atualizar STATE é o último passo de TODO fluxo.

## 6. Memória em 4 níveis (não jogue tudo no Claude)

| Nível | Onde | Vive até | Exemplo |
|---|---|---|---|
| **L0 sessão** | contexto da conversa | a sessão | "bug atual é o PIX do fulano" |
| **L1 projeto** | `.planning/STATE.md` | até mudar o foco | foco atual, concluídos, próximos |
| **L2 decisões** | `docs/decisions/ADR-NNN-*.md` | para sempre | "pagamento depois do preparo, porque..." |
| **L3 global** | `~/.claude/CLAUDE.md` + memory auto | para sempre | preferências de código do Edmilson |

Regras:
- Informação transitória **nunca** vira memória permanente.
- Decisão arquitetural **sempre** vira ADR (template em `templates/ADR.md`).
  Daqui a 6 meses você pede "muda o fluxo de pagamento" e o Claude descobre
  POR QUE ele é assim — isso é ouro.
- O Claude não precisa "lembrar tudo"; ele precisa saber **onde encontrar**
  (índice cerebral, não enciclopédia):

```
CLAUDE.md (≤ 200 linhas, é ÍNDICE)
   ↓ aponta para
Arquitetura → .planning/codebase/ARCHITECTURE.md
Estado      → .planning/STATE.md
Decisões    → docs/decisions/
Produto     → docs/product/ (ou PRODUCT.md na raiz)
Regras      → .claude/rules/
```

Prioridade de verdade: **1 código · 2 CLAUDE.md · 3 STATE · 4 ROADMAP/PROJECT ·
5 ADRs/docs · 6 memória auxiliar (auto-memory, grafo) · 7 histórico**. Memória
vetorial/grafo pode defasar; código e doc versionada prevalecem.

## 7. MCP: toolbox externa, com escopo

- **Global**: só o que serve a TODOS os projetos (github, context7, serena).
- **Local do projeto**: o que é daquele domínio (mercadopago aqui; playwright+postgres no Dr. Exame).
- **Nunca global**: MCP de um emprego/produto específico. (No diagnóstico real:
  11 MCPs `wibx-*` — de outro trabalho — vazando pra TODA sessão, inclusive esta.)
- Duplicado global+local = local sobra (context7/serena estavam nos dois).
- Meta: ≤ 6 MCPs carregados por sessão. Mais que isso, o Claude escolhe pior.

## 8. Fluxo de execução padrão

```
REQUEST → TRIAGE → DISCOVER → PLAN → IMPLEMENT → VERIFY → REVIEW → MEMORY
```

- **TRIAGE** (orchestrator): `simple` executa direto · `medium` =
  investigar→planejar→implementar→testar · `large` = GSD.
- **DISCOVER**: a regra fundamental (ver §9) ANTES de qualquer plano.
- **VERIFY**: build + testes + regressão (o que o projeto definir como gate).
- **MEMORY**: atualizar STATE.md (+ ADR se houve decisão) — passo que encerra
  o trabalho. Trabalho sem MEMORY está incompleto.

## 9. A regra fundamental

```md
## Existing implementation first

Before implementing anything:
1. search the repository
2. identify related implementations
3. inspect existing services/components
4. reuse existing architecture
5. extend before replacing
6. create new abstractions only when necessary
```

Isso mata o pior bug de IA num codebase maduro: reinventar funcionalidade que
o projeto já tem. (No Janocaminho isso já aconteceu: a navegação admin tinha 5
cópias porque ninguém descobriu a 1ª antes de criar a 2ª.)

## 10. Estrutura-alvo por projeto

```
meu-projeto/
├── CLAUDE.md                  ← índice cerebral (≤200 linhas)
├── .claude/
│   ├── agents/                ← orchestrator + especialistas (se não globais)
│   ├── skills/                ← SÓ skills do domínio deste projeto
│   ├── rules/                 ← coding, testing, git (referenciadas no CLAUDE.md)
│   ├── hooks/ + settings.json
├── .planning/                 ← camada GSD
│   ├── PROJECT.md  ROADMAP.md  STATE.md
│   └── codebase/              ← map-codebase (STACK, ARCHITECTURE, ...)
├── docs/
│   ├── decisions/             ← ADRs
│   ├── product/  architecture/
└── src/
```

Global (`~/.claude/`): `CLAUDE.md` (preferências universais), `agents/`
(orchestrator + especialistas universais), `skills/` (genéricas), `rules/`
(transversais). **Nada de regra de projeto específico no global** — senão o
Claude pensa em Mercado Pago num projeto de exames médicos.

## 11. Checklist de adoção (ordem que funciona)

1. **Inventariar**: árvore de `~/.claude` e `.claude/` do projeto; lista de MCPs
   com escopo (global × por-projeto). (Script de 1 linha no diagnóstico.)
2. **Classificar** cada item: Agent / Skill / MCP / Rule / Memory / Workflow.
3. **Caçar duplicatas**: mesma capacidade N vezes → eleger 1 titular, arquivar
   o resto (não deletar: mover pra `~/.claude/backups/`).
4. **Criar o orchestrator** (template pronto) e apontá-lo como porta de entrada.
5. **Padronizar CLAUDE.md** como índice (template) — substitui acúmulo de docs
   soltos; as antigas viram alvo do índice ou são absorvidas.
6. **Instalar GSD como planejamento**: `/gsd:map-codebase` → PROJECT/ROADMAP/STATE.
7. **Criar ADRs retroativos** para as 5 decisões mais importantes do projeto
   (template; 10 min cada).
8. **Escopar MCPs**: tirar do global tudo que não é universal; dedup local.
9. **Padronizar startup**: CLAUDE.md manda ler STATE primeiro, carga progressiva.
10. **Só então limpar** — remover duplicatas/arquivados por último, quando a
    arquitetura nova já está funcionando.

**Não reinstale do zero.** Um setup que cresceu tem 70–80% das peças; o que
falta é a arquitetura dizendo quem manda em quem.

## 12. Anti-padrões (vistos em produção, evite)

- 286 skills globais listadas por sessão → paralisia + contexto caro.
- MCP de outro emprego no global → vaza em todo projeto.
- `design-taste-frontend` E `design-taste-frontend-v1` (legado) convivendo.
- 4 sistemas de documentação sem hierarquia (CLAUDE.md modular + .ai/ +
  PROJECT_CONTEXT + memory) — ninguém sabe qual prevalece.
- STATE inexistente → toda sessão redescobre "onde paramos".
- Decisão arquitetural só no histórico do chat → perdida em 1 semana.

## 13. Portando pra outro projeto

1. Copie esta pasta (`docs/claude-platform/`) pro novo repo (ou pra
   `~/.claude/platform/` e referencie).
2. Siga o checklist §11 na ordem.
3. Preencha os templates: `CLAUDE.md`, `orchestrator.md`, `STATE.md`, `ADR.md`,
   `rules/coding.md`.
4. Rode `/gsd:map-codebase` e escreva os 5 primeiros ADRs retroativos.
5. Pronto: `cd projeto && claude` → o Claude lê CLAUDE.md → STATE → sabe onde
   parou → orchestrator tria → especialistas executam com skills → STATE
   atualiza no fim.
