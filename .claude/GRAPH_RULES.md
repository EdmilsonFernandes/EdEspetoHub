# Graphify Rules — EdEspetoHub

> **Graphify é o MCP principal. Toda alteração começa por ele.**
> Nunca alterar código sem antes consultar o grafo — saber o impacto ANTES de editar.
> O EdEspeto é multi-serviço (frontend/backend/apis/mobile/face-worker): o impacto cruzado é grande.

## O que descobrir antes de criar/alterar
- **Quem usa** este componente/rota/entidade? (`graphify explain "<simbolo>"`)
- **Quem depende** dele? (`graphify path "<origem>" "<destino>"`)
- **Quem será impactado**? (frontend ↔ BFF apis ↔ backend ↔ mobile; jobs; face-worker)
- **Existe algo semelhante** ou duplicado?
- **Existe padrão** compartilhado a seguir?

## Princípios
- **Reuso primeiro.** Nunca criar novo se existir semelhante — estender o existente.
- **Sem duplicação** entre serviços (ex: regra de negócio no backend, não replicar no BFF).
- **Atualizar o grafo** após grandes mudanças estruturais (nova entidade, nova rota, novo módulo).

## CLI e skill (NÃO existe `query` no CLI)
| Recurso | Uso |
|---|---|
| `/graphify` (skill) | consulta em linguagem natural ao knowledge graph — trigger principal |
| `graphify path "A" "B"` | caminho mais curto entre dois nós |
| `graphify explain "X"` | explicação de um nó e seus vizinhos |
| `graphify diagnose multigraph` | risco de colapso de arestas same-endpoint |

- Grafo em `graphify-out/graph.json` (versionado). Se faltar, reconstruir antes de usar.
- Combinar **Graphify** (relações/impacto amplo) com **Serena** (símbolo exato, body, referências, edição).
