# Design System — EdEspetoHub (Já no Caminho)

> **Identidade é inegociável.** Marketplace local multi-segmento: moderno, vibrante, confiável.
> Fonte principal: `docs/IDENTIDADE_JANOCAMINHO.md`.

## Identidade de marca
- **Plataforma:** "Já no Caminho" — não é só "churrasco/espeto"; é multi-segmento (mercado, farmácia, adega, food truck, restaurantes, destinos turísticos, condomínios).
- **Logo/asset:** `frontend/public/janocaminho.jpg` (referência visual principal).
- **Linguagem visual:** moderna, vibrante e confiável — "plataforma multi-segmento".

## Cores (NÃO alterar a paleta base)
| Token | Cor | Uso |
|---|---|---|
| **Primary** | **`#2f9df7`** (azul) | confiança, tecnologia — cor principal da marca |
| **Secondary/Accent** | **`#5fd35a`** (verde) | sucesso, entrega, confirmação |
| **CTA/destaque** | **laranja** (pontual) | botões de ação principal, destaque de preço |

- Azul = confiança/tecnologia; verde = sucesso/entrega; laranja = CTA pontual (não abusar).

## UI/UX
- **Stack de UI:** **Tailwind CSS 4** (NÃO é MUI). Estilização por classes utilitárias.
- **Componentes:** cards com elevação suave e bordas amplas; seções com hierarquia clara (título → subtítulo → conteúdo → ação).
- **Interação:** estados de foco e hover evidentes (web).
- **Mobile:** Capacitor 7 (PWA + APK/AAB). WebView file picker Android via `MainActivity.java` (`onShowFileChooser` nativo).

## Jornadas principais (mapa de telas)
- **Cliente:** `StorePage`, `MenuView`, `CartView`, `OrderTracking`.
- **Lojista (admin):** `AdminDashboard`, `AdminOrders`, `AdminQueue`, `AdminMotoboys`.
- **Entregador:** `Motoboy*.tsx`, `components/Motoboy/*`.
- **Landing/portfolio:** `LandingPage`, `PortfolioPage`, `Hero`.

## Pendência conhecida (Fase 2 da migração de identidade)
- Padronizar tokens de gradiente/sombras num arquivo único de tema.
- Refinos pendentes em LandingPage, PortfolioPage, AdminQueue, StorePage (cards mais premium + CTA claro) e tipografia final.
- Ver `docs/IDENTIDADE_JANOCAMINHO.md` → "Próxima Execução".

## Gotchas de UI
- **Nginx 413** (upload de logo) → `client_max_body_size 20m;` no nginx.
- **WebView file picker Android** → `MainActivity.java` com `onShowFileChooser`.
- **SSL `chamanoespeto.com.br` expirado** → migrando pra `janocaminho.com.br` (ver `TODO_MIGRACAO_DOMINIO_JANOCAMINHO.md`).
