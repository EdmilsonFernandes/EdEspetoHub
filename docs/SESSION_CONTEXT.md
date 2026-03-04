# Session Context (Persistente)

Este arquivo mantém o estado de trabalho para retomada rápida entre sessões.

## Regra de uso
- A cada alteração relevante (código, bug, decisão de arquitetura, deploy), atualizar este arquivo.
- Sempre registrar:
  - `Data/Hora`
  - `Resumo objetivo`
  - `Arquivos impactados`
  - `Commit`
  - `Próximo passo`

---

## Snapshot atual
- Data: 2026-03-04
- Branch: `main`
- HEAD: `c91f6e7`
- Status local: limpo (sem alterações pendentes)

### Últimos commits
1. `c91f6e7` fix(order-tracking): hide delivery forecast wording for pickup/table
2. `ae56073` style(onboarding): replace broken mobile stepper with connected minimalist progress line
3. `dea8331` style(onboarding): switch create-store to single-column clean layout and remove preview panel
4. `d5d2abc` style(onboarding): premiumize create-store inputs, sticky nav bar and plan selection visuals
5. `39a0f9e` style(branding): add Ja no Caminho logo to powered-by links and create-store header
6. `2261502` fix(menu): use branding accentColor for dynamic add button theme
7. `c0fb56a` feat(menu): make add button color inherit store secondary color with fallback
8. `ddad8cc` feat(landing): add featured stores social proof strip below hero

### Estado funcional recente
- `OrderTracking`: correção de texto/semântica de previsão:
  - `delivery`: mantém “Previsão de entrega/chegada” e “Chega por volta de”.
  - `pickup/table`: usa “Previsão de preparo” e “Pronto por volta de”.
- Catálogo:
  - botão de adicionar agora herda cor de identidade da loja (fallback seguro).
  - barra de categorias sticky com contraste forte e ação de menu (bottom-sheet).
  - melhorias de cards, busca, categorias e seção “mais pedidos”.
- Checkout:
  - limpeza visual premium mobile e remoção da dica de pagamento para ganhar tela.
- Landing:
  - seção de prova social com lojas em destaque.
- Onboarding/Criar loja:
  - layout em coluna única.
  - stepper mobile conectado sem scroll horizontal.
  - refinos visuais de inputs, planos e navegação.

### Atualização desta sessão
- Data/Hora: 2026-03-04
- Resumo objetivo:
  - Salvo e publicado o ajuste do `OrderTracking` para impedir comunicação de entrega em pedidos não-delivery.
  - Mensagens ajustadas conforme tipo de pedido sem alterar regra de negócio.
- Arquivos impactados:
  - `frontend/src/pages/OrderTracking.tsx`
- Commit:
  - `c91f6e7` (push em `origin/main`)
- Validação:
  - `npm run build` em `frontend` passou.
- Próximo passo:
  - validar em produção os 3 fluxos: `delivery`, `pickup` e `table` no acompanhamento.

### Observações operacionais (Git/Deploy)
- Em alguns ambientes houve instabilidade com `ssh.github.com:443`.
- Fluxo que funcionou: push usando URL `git@github.com:EdmilsonFernandes/EdEspetoHub.git`.

---

## Próximo passo sugerido
- Rodar smoke test mobile completo: catálogo -> checkout -> tracking -> área do entregador -> onboarding.
