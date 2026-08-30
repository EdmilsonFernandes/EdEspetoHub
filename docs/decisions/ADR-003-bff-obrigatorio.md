# ADR-003 — Frontend nunca fala direto com o backend; BFF obrigatório

2026 · aceito

## Context

O frontend precisa de um ponto único para autenticação de sessão, shape de
contratos estável e regras de acoplamento (ex.: cupom resolvido no BFF,
commit c4699388), sem expor o backend diretamente à internet.

## Decision

Todo tráfego do browser/APK passa por `/api/*` → BFF Express (:5000) →
backend (:4000). O frontend NUNCA chama `:4000` diretamente.

## Reason

- Contratos estáveis para o APK (serverUrl fixo — binário não atualiza fácil).
- Um lugar para shape/caching/autorização de borda (contract-check no apis).
- Superfície de ataque menor no backend.

## Consequences

- Toda feature nova define o contrato no BFF junto (duplicação deliberada).
- Debug de erros: olhar BFF e backend (erro formatado em `/api`, causa no :4000).
- Nginx: `/api/*` → :5000, `/uploads/*` → :4000 (uploads = S3 híbrido via SSM).
