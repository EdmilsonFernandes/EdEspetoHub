# <Projeto> — Instructions (índice cerebral)

> Este arquivo é um ÍNDICE, não uma enciclopédia: ≤200 linhas, aponta para onde
> a informação mora. Leia primeiro; carregue o resto progressivamente.

## Missão (1 parágrafo)

O que este produto é, para quem, e o que "sucesso" significa agora.

## Startup (toda sessão)

1. `.planning/STATE.md` — onde paramos (SEMPRE primeiro).
2. Escopo da tarefa define o que carregar abaixo. Não carregue tudo sempre.

## Onde mora cada coisa

| Assunto | Onde |
|---|---|
| Stack & arquitetura | `.planning/codebase/STACK.md` · `ARCHITECTURE.md` |
| Convenções & testes | `.planning/codebase/CONVENTIONS.md` · `TESTING.md` |
| Integrações & riscos | `.planning/codebase/INTEGRATIONS.md` · `CONCERNS.md` |
| Decisões (por que é assim) | `docs/decisions/` (ADRs) |
| Produto | `docs/product/` |
| Estado & roadmap | `.planning/STATE.md` · `ROADMAP.md` |
| Regras de execução | `.claude/rules/` (coding, testing, git) |

## Gates de validação (antes de TODO commit)

| Mudança | Comando obrigatório |
|---|---|
| <frontend/backend/etc.> | <comando de build + testes> |
| Migration | <status + testes> |

- Build completo (não só typecheck), exit code sem máscara.
- Teste de regressão quando o pedido for correção.

## Fluxo de trabalho

- simple → direto · medium → investigar→planejar→implementar→testar ·
  large → GSD/SDD. (Ver `agents/orchestrator.md`.)
- UI → agente product-designer/frontend · backend → backend · DB → database ·
  QA → qa · segurança → security.

## Regras fundamentais

1. **Existing implementation first** — buscar antes de criar; reusar > estender
   > substituir > criar.
2. Não modificar código fora do escopo pedido.
3. Decisão arquitetural → ADR. Estado do trabalho → STATE.md. Nada de
   transitório em memória permanente.
4. Deploy/produção: <política do projeto — quem roda, como>.

## Skills do projeto (domínio — as genéricas são globais)

- `<skill-local-1>` — quando usar
- `<skill-local-2>` — quando usar
- Toda skill nova entra aqui; skill fora do índice é skill morta.

## Gotchas que já morderam

- <bug ambiental, porta, cache, ordem de declaração… máx. 10 linhas>
