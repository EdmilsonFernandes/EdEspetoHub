# Migracao de Identidade - Jano Caminho

Objetivo: migrar a identidade visual antiga para uma linha global (mercado, farmacia, adega, food truck e restaurantes), usando o asset `janocaminho.jpg` como referencia principal.

## Base Aplicada (Fase 1)

- Logo/plataforma padrao apontando para `frontend/public/janocaminho.jpg`.
- Cores base da marca atualizadas para:
  - Primary: `#2f9df7` (azul)
  - Secondary/Accent: `#5fd35a` (verde)
- Metadados iniciais de SEO/PWA alinhados com nova imagem.

## Inventario de Areas para Refino (Fase 2)

- Landing e portfolio:
  - `frontend/src/pages/LandingPage.tsx`
  - `frontend/src/pages/PortfolioPage.tsx`
  - `frontend/src/components/Hero.tsx`
- Jornadas do lojista (admin):
  - `frontend/src/pages/AdminDashboard.tsx`
  - `frontend/src/pages/AdminOrders.tsx`
  - `frontend/src/pages/AdminQueue.tsx`
  - `frontend/src/pages/AdminMotoboys.tsx`
  - `frontend/src/components/Admin/*`
- Jornadas do cliente:
  - `frontend/src/pages/StorePage.tsx`
  - `frontend/src/components/Client/MenuView.tsx`
  - `frontend/src/components/Client/CartView.tsx`
  - `frontend/src/pages/OrderTracking.tsx`
- Jornadas do entregador:
  - `frontend/src/pages/Motoboy*.tsx`
  - `frontend/src/components/Motoboy/*`

## Direcao Visual Recomendada

- Linguagem:
  - moderna, vibrante e confiavel
  - menos "churrasco-only", mais "plataforma multi-segmento"
- Cores:
  - azul para confianca e tecnologia
  - verde para sucesso/entrega/confirmacao
  - laranja pontual para CTA e destaque de preco
- Componentes:
  - cards com elevacao suave e bordas amplas
  - secoes com hierarquia clara (titulo, subtitulo, conteudo, acao)
  - estados de foco e hover mais evidentes para web

## Proxima Execucao Recomendada

1. Padronizar tokens de gradiente e sombras em um arquivo unico de tema.
2. Refatorar `LandingPage` + `PortfolioPage` para nova assinatura visual.
3. Refatorar `AdminQueue` para layout clean consistente com cardapio.
4. Refatorar `StorePage` (cliente) com cards de produto mais premium e CTA claro.
5. Ajustar tipografia final (familia e escala) e validar contraste/acessibilidade.

