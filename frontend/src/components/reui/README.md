# ReUI & Design System Guide — Já no Caminho

Este documento descreve os padrões visuais, utilitários e componentes estilizados no ecossistema **ReUI** integrados ao marketplace do Já no Caminho.

---

## 1. Princípios de Design & ReUI

- **Bordas Squircle Suaves**: Preferência por `rounded-2xl` e `rounded-3xl` para cards, modais e sheets.
- **Micro-interações**: Feedback tátil com `active:scale-[0.98]` ou `active:scale-95` e transições suaves (`transition-all duration-200`).
- **Paleta Temática Contextual**:
  - **Urbano / Moradia**: Azul institucional (`#2563EB` / `blue-600`) e Índigo (`indigo-600`) para condomínios.
  - **Turismo / Serra**: Gradientes e acentos esmeralda/teal (`emerald-600`, `teal-700`, `bg-emerald-50`).
  - **Status & Badges**: Tons pastéis de apoio (`amber-100`, `emerald-100`, `slate-100`).

---

## 2. Componentes Criados & Integrados

### `<MiniBanner />`
- **Caminho**: [`frontend/src/components/Marketplace/Hub/MiniBanner.tsx`](../Marketplace/Hub/MiniBanner.tsx)
- **Objetivo**: Apresentação compacta e premium de cidades turísticas e destinos da Mantiqueira/Litoral.
- **Props**:
  - `title`: Nome do destino (ex.: "São Francisco Xavier", "Gonçalves").
  - `state`: Sigla do estado (ex.: "SP", "MG").
  - `count`: Quantidade de chalés ou parceiros locais disponíveis.
  - `selected`: Estado visual ativo (ring esmeralda, gradiente suave e ícone de check).
  - `bannerUrl` (opcional): Imagem de capa do destino.
  - `onClick`: Callback de seleção de destino.

---

## 3. Classes Utilitárias Comuns ReUI

| Classe | Finalidade |
|---|---|
| `jnc-hub-touch` | Otimização para toque mobile com feedback de pressão |
| `rounded-2xl`, `rounded-3xl` | Geometria arredondada premium ReUI |
| `shadow-2xs`, `shadow-xs`, `shadow-sm` | Sombras sutis e multicamadas |
| `ring-2 ring-emerald-500/30` | Realce acessível de item ativo/focado |

