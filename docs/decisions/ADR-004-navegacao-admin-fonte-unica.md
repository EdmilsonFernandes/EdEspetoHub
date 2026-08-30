# ADR-004 — Navegação admin em fonte única (adminNavigation.ts)

2026-08-29 · aceito

## Context

O menu do painel admin cresceu em 5 cópias independentes (uma por página) com
labels, ícones e destinos divergentes ("Frankenstein"): 3 labels para o mesmo
item, itens de config extintos ainda no drawer mobile, `cupons` renderizando
depois do Sair, estado ativo com 3 fontes de verdade.

## Decision

Toda a navegação admin (sidebar desktop, drawer mobile, bottom nav, paleta
Ctrl+K, drawer Conta) deriva de UMA fonte: `frontend/src/navigation/adminNavigation.ts`
+ hook `useAdminNav` (padrão já provado em `superAdminNavigation.ts`).
Papel (operador/lojista) e superfície são filtrados na fonte.

## Reason

- Mudança de menu = 1 arquivo (antes: 5 + risco de divergir).
- Granularidade operador/lojista testável (19 testes de paridade + isolamento
  por superfície — "não perder nada" e "operador não vê item de lojista").

## Consequences

- Novo destino de menu entra SÓ na fonte (nunca em página).
- Chrome (grid/sidebar/compact) é do `AdminLayout` (`withSidebar` opt-in).
- Layout desktop vale a partir de 768px (escala do Windows do lojista);
  bottom nav sem hide-on-scroll; ☰ = Menu, avatar = Conta.
- Pendências legadas: `@ts-nocheck` em AdminMobileBottomNav/AdminHeader/AdminDashboard;
  teal no DevicePermissionsCard.
