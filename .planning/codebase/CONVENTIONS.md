# CONVENTIONS

- Código em inglês, comentários/UI em pt-BR; seguir o estilo do arquivo tocado.
- Commits: `tipo(escopo): mensagem — refs` (ex.: `feat(admin-nav): ... — REQ-1, T2`).
  Toda tarefa concluída = commit + push (regra do Edmilson).
- Migrations: sempre corretivas, registradas em `index.ts` (ADR-005).
- Menu/navegação: só via `adminNavigation.ts` (ADR-004).
- Tailwind 4 (NÃO MUI); primitivas via `@theme`; ícones phosphor no admin.
- Exit code nunca mascarado (`| tail` sem `echo EXIT:$?` = erro de processo).
- `@ts-nocheck` esconde TDZ: revisar ordem de declaração manualmente no diff.
- AAB: versionCode+1 SEMPRE + `npm --prefix frontend run build` + cap sync
  antes do bundleRelease; conferir SHA1 (CA:AB:50) e o hash do bundle DENTRO do aab.
