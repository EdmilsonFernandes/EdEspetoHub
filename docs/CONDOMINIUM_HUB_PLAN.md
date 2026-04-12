# Condominium Hub Plan

## Context

The current Hub already works as a marketplace for stores. Each store has its own catalog, checkout, order flow, admin queue, tracking, payment settings, and Android app access through `/hub`.

The condominium feature should extend the Hub with a hyperlocal mode without replacing the existing marketplace behavior.

Current flow:

```text
Hub -> Store -> Catalog -> Checkout -> Order
```

Target flow:

```text
Hub -> Selected condominium -> Stores in that condominium -> Catalog -> Checkout -> Order
```

The official app remains `Ja no Caminho`. Condominium commerce is a mode inside the app, not a separate app.

## Product Goal

Allow residents to choose a condominium and see stores/stands linked to that condominium's fair or local commerce. The resident can order from those stores and either pick up at the stand or request internal apartment delivery when available.

Examples:

- barbecue/skewer stand
- cheese stand
- snacks
- handmade products
- vegetables
- desserts

## Non Goals For MVP

- Do not create a separate APK per condominium.
- Do not replace the current Hub.
- Do not force all users to choose a condominium.
- Do not integrate condominium delivery with motoboy in the first version.
- Do not create a condominium organizer panel in the first version.
- Do not change payment logic in the first version.
- Do not create a new order type unless proven necessary.

## Strategy

Add condominium as an optional context over the current store/order model.

Keep existing order types:

```text
delivery
pickup
table
```

Use condominium context to adapt UX and order metadata:

```text
condominiumId
condominiumName
block/tower
apartment
fulfillment within condominium
```

Recommended condominium fulfillment values:

```text
pickup_at_stall
apartment_delivery
```

This avoids breaking existing code that depends on `order.type`.

## MVP Scope

### Phase 1 - Discovery Layer

Backend:

- Create `condominiums`.
- Create `store_condominiums`.
- Add public endpoints to list condominiums and stores by condominium.
- Add basic admin/super-admin endpoints later for management.

Frontend:

- Hub shows a "Feira no Condominio" entry point.
- User selects a condominium.
- Hub filters stores by selected condominium.
- Store cards show condominium context when active.

No checkout changes in Phase 1.

### Phase 2 - Checkout Context

Frontend:

- Store page receives condominium context from query/localStorage.
- Checkout changes only when condominium context is active.
- For pickup, ask only basic contact plus optional block/apartment.
- For apartment delivery, ask block/tower and apartment.

Backend:

- Add nullable condominium fields to orders.
- Save condominium context on order creation.
- Return condominium context in admin order lists and public tracking.

Admin:

- Show condominium, block/tower, apartment, and fulfillment mode on queue/order cards.

### Phase 3 - Schedule And Availability

- Each store can have a schedule per condominium.
- Hub can show stores available today in the selected condominium.
- Store can be open globally but unavailable in a specific condominium, and vice versa.

### Phase 4 - Organizer Layer

Future:

- Condominium organizer account.
- QR code for condominium fair.
- Store invitations.
- Reports by event/condominium.
- Sponsored placement inside a condominium.

## Proposed Data Model

### `condominiums`

```text
id uuid primary key
name text not null
slug text unique not null
description text
address text
city text
state text
zip_code text
lat numeric
lng numeric
logo_url text
banner_url text
active boolean default true
created_at timestamptz
updated_at timestamptz
```

### `store_condominiums`

```text
id uuid primary key
store_id uuid references stores(id)
condominium_id uuid references condominiums(id)
active boolean default true
schedule jsonb default []
pickup_instructions text
allow_pickup_at_stall boolean default true
allow_apartment_delivery boolean default false
apartment_delivery_fee numeric(10,2)
notes text
created_at timestamptz
updated_at timestamptz
unique(store_id, condominium_id)
```

Suggested schedule JSON:

```json
[
  {
    "day": 2,
    "intervals": [
      { "start": "17:00", "end": "22:00" }
    ]
  }
]
```

`day` follows the JavaScript convention:

```text
0 Sunday
1 Monday
2 Tuesday
3 Wednesday
4 Thursday
5 Friday
6 Saturday
```

### `orders` additions

```text
condominium_id uuid null references condominiums(id)
condominium_name text null
condominium_block text null
condominium_apartment text null
condominium_fulfillment text null
```

Order fields stay nullable so existing orders and flows remain valid.

## Proposed API

Public:

```text
GET /api/public/condominiums
GET /api/public/condominiums/:slug
GET /api/public/condominiums/:slug/stores
```

Admin/super-admin future:

```text
GET /api/admin/condominiums
POST /api/admin/condominiums
PATCH /api/admin/condominiums/:id
POST /api/admin/condominiums/:id/stores
PATCH /api/admin/condominiums/:id/stores/:storeId
DELETE /api/admin/condominiums/:id/stores/:storeId
```

Store admin future:

```text
GET /api/stores/:storeId/condominiums
POST /api/stores/:storeId/condominium-requests
```

## Hub UX

The Hub should keep the general marketplace first.

Recommended entry points:

```text
Feira no Condominio
Escolha seu condominio e veja as lojas disponiveis hoje.
```

When selected:

```text
Feira no Jardim Veneza
Lojas abertas agora
Retirada na barraca ou entrega no apartamento
```

State can initially be stored in URL and localStorage:

```text
/hub?condominio=jardim-veneza
```

When opening a store from condominium mode:

```text
/store-slug?condominio=jardim-veneza
```

## Checkout UX

When condominium context is inactive, checkout remains unchanged.

When condominium context is active:

Pickup at stall:

```text
Name
Phone
Block/Tower optional
Apartment optional
Observation optional
```

Apartment delivery:

```text
Name
Phone
Block/Tower
Apartment
Observation optional
```

Do not ask full street/CEP because the condominium already contains the macro address.

## Admin Queue UX

Order card should show:

```text
Condominio Jardim Veneza
Torre B - Apto 1204
Retirar na barraca
```

or:

```text
Condominio Jardim Veneza
Torre B - Apto 1204
Entrega no apartamento
```

This should appear in admin queue, order details, tracking, and receipt/print where relevant.

## Risks

1. Motoboy coupling
   - Apartment delivery inside condominium should not automatically enter motoboy flow.
   - MVP should keep internal delivery separate.

2. Order type coupling
   - Avoid introducing `type = condominium` in MVP.
   - Keep `pickup` and `delivery`, with condominium metadata.

3. Hub performance
   - Current Hub loads public stores and then enriches/searches products.
   - Condominium filtering should avoid multiplying product fetches.

4. Store availability
   - Store can be open globally but not operating in a specific condominium today.
   - Phase 1 can ignore schedule; Phase 3 should solve it.

5. Data governance
   - Avoid letting any merchant create public condominiums freely.
   - Start with super-admin managed condominiums.

## Suggested Implementation Order

1. Create this plan.
2. Add backend data model and migrations.
3. Add public read endpoints.
4. Add simple seed/manual data for one real condominium.
5. Add Hub condominium selector/filter.
6. Add checkout context.
7. Add admin/queue/tracking display.
8. Add schedule.
9. Add organizer/admin workflows.

## Test Checklist

Existing flows must continue to pass:

- Hub loads all stores without condominium selected.
- Store page by slug still works.
- Normal delivery checkout still works.
- Pickup checkout still works.
- Table checkout still works.
- Admin queue still lists current orders.
- Public tracking still opens old orders.
- Android app still opens `/hub`.

New flows:

- Public condominium list loads.
- Selecting condominium filters stores.
- Store opened from condominium keeps context.
- Condominium checkout saves block/apartment.
- Admin sees condominium context in the order.
