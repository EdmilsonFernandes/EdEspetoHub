# Diagnóstico — setup Claude do EdEspetoHub (29/08/2026)

> Exemplo trabalhado do `PLAYBOOK.md`: o que existe hoje, no que vira, e a
> lista de poda. Aplicar na ordem do checklist (PLAYBOOK §11) — nada de teardown.

## 1. Inventário medido

### Global (`~/.claude/`)
| Item | Hoje | Diagnóstico |
|---|---|---|
| skills/ | **286 pastas** | ~20× o ideal; paralisia de escolha + contexto caro por sessão |
| agents/ | 1 (web-search) + `agents-library/` (wshobinson, agency-agents dormant) | **Sem orchestrator** — a peça central não existe |
| CLAUDE.md | caveman (economia de token) | OK como L3, mas é o ÚNICO global |
| MCP global | context7, github, ms-planner, serena, ui-expert + **11 `wibx-*`** | wibx-* é de OUTRO trabalho vazando em toda sessão (inclui 7 Postgres) |

### Projeto (`.claude/` + anexos)
| Item | Hoje | Diagnóstico |
|---|---|---|
| skills/ | 44 (UX pack + sdd-* + graphify + impeccable + 2 versões design-taste…) | ~8 capacidades reais; resto é sobreposição |
| docs modulares | STARTUP, AGENTS, GRAPH_RULES, ARCHITECTURE, DESIGN_SYSTEM, TASK_RULES | Bom material, sem hierarquia única |
| `.ai/` | SKILL.md (ops), agent-rules.md, sdd/ | 2º sistema de regras paralelo ao CLAUDE.md |
| Raiz | PRODUCT.md, PROJECT_CONTEXT.md, constitution.md, specs/ | PROJECT_CONTEXT = proto-STATE; constitution = proto-ADR |
| Memória | auto-memory (~30 entradas) | Boa, mas carrega estado que deveria ser STATE.md |
| Grafo | graphify-out/ + hooks | Bom (code map) — trata como camada 6 da verdade |
| GSD | skill instalada, **não inicializada** | Nunca rodou map-codebase; sem .planning/ |
| ADRs | **inexistentes** | Decisões vivem no histórico do chat e no constitution.md |
| MCP local | context7, mercadopago, serena | context7+serena duplicados do global |

## 2. Mapeamento: hoje → alvo

| Hoje | Vira |
|---|---|
| `.ai/agent-rules.md` + TASK_RULES.md | `.claude/rules/` (coding/testing/git) referenciadas no CLAUDE.md |
| `.ai/SKILL.md` (ops profunda) | `.planning/codebase/ARCHITECTURE.md` (via /gsd:map-codebase) + `docs/architecture/` |
| `PROJECT_CONTEXT.md` | **`.planning/STATE.md`** (formato do template) — o proto-STATE vira o real |
| `constitution.md` (SDD) + decisões espalhadas | `docs/decisions/ADR-001…007` retroativos (comissão zero, pedido só entra na fila pago, SDD como processo, etc.) |
| STARTUP/AGENTS/GRAPH_RULES/ARCHITECTURE/DESIGN_SYSTEM | Absorvidos pelo CLAUDE.md-índice → `.planning/codebase/*` → `.claude/rules/`; os arquivos atuais viram alvo do índice |
| skills sdd-* (7) | Ficam LOCAIS (domínio do processo deste projeto) ✓ |
| skills UX: impeccable como titular do design; graphify; playwright-visual-qa; caveman (global) | Titulares. As ~35 demais UX → `~/.claude/backups/skills-ux-archive/` |
| MCP wibx-* (11) | **Sai do global** → vira config do projeto Wibx (`.claude.json` daquele diretório) |
| context7+serena locais | Remover (já globais) |
| agents-library/ | Arquivar (não referenciado) |
| auto-memory | Continua como L-auxiliar; **estado de trabalho migra pra STATE.md**; memória vira fatos duráveis (referências/feedback), não "onde paramos" |

## 3. Poda proposta (só depois da arquitetura no ar — checklist passo 10)

1. MCP: mover 11 `wibx-*` global → projeto Wibx; remover context7/serena duplicados locais. (Maior ganho imediato: −15 ferramentas por sessão.)
2. Skills globais 286 → ~30 titulares + `backups/` (capacidades únicas: caveman-*, gsd, archify, research pack, ui-ux-pro-max OU impeccable—escolher 1 canal).
3. Skills locais 44 → ~12 (7 sdd + impeccable + graphify + playwright-qa + guardians usados); arquivar `design-taste-frontend-v1` (legado), duplicatas de design.
4. `agents-library/` → backups.
5. Criar `~/.claude/agents/orchestrator.md` (template) + especialistas conforme necessidade real (começar só com orchestrator + qa; não criar 12 de uma vez).

## 4. Os 5 primeiros ADRs retroativos (rascunho de títulos)

1. ADR-001 — Comissão zero: receita por mensalidade, nunca por pedido
2. ADR-002 — Pedido entra na fila somente após pagamento confirmado (webhook)
3. ADR-003 — Frontend nunca fala direto com backend; BFF obrigatório (:5000)
4. ADR-004 — Navegação admin em fonte única (adminNavigation.ts) — 29/08/2026
5. ADR-005 — Migrations TypeORM: criar nova corretiva, nunca editar aplicada

(Conteúdo existe no constitution.md, PRODUCT.md e no histórico — é só redigir no
formato do template.)

## 5. Roteiro de execução aqui (1ª semana)

1. `mkdir .planning docs/decisions` + STATE.md (do PROJECT_CONTEXT) + ADR 1–5.
2. `/gsd:map-codebase` → popular `.planning/codebase/`.
3. Instalar `orchestrator.md` no `.claude/agents/` local (pilotar antes de global).
4. CLAUDE.md do projeto reescrito como índice (≤200 linhas) apontando pra tudo.
5. MCP: mover wibx-* pro projeto certo (edita `~/.claude.json` — global fora,
   projeto Wibx dentro) + remover duplicados locais.
6. Pilotar 1 semana → só então podar skills (global 286→~30, local 44→~12).
