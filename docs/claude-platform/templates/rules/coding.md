# Rule — coding (transversal)

## Existing implementation first

Before implementing anything:

1. search the repository
2. identify related implementations
3. inspect existing services/components
4. reuse existing architecture
5. extend before replacing
6. create new abstractions only when necessary

Se encontrou algo que resolve (ou quase), informe antes de criar novo.

## Escopo

- Never modify unrelated code.
- Refactors só com pedido explícito.
- Todo bugfix não-trivial ganha teste que o pegaria.

## Qualidade

- Siga o estilo do arquivo tocado (naming, densidade de comentário, idioma).
- Exit code de build/teste nunca mascarado (`| tail` sem checagem = erro).
- Validação do projeto (ver CLAUDE.md → Gates) verde antes de TODO commit.

## Segurança

- Nunca commitar secrets/.env/keys/.pem/.jks.
- Dado sensível (LGPD/biometria/financeiro): revisão security antes de mergar.
