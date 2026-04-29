# Backend Jobs

Guia de referência dos jobs agendados da API, com o padrão atual do projeto.

## Como os jobs funcionam hoje

Os jobs do backend são **jobs em memória do processo Node**.

Na prática isso significa:

- eles sobem junto com a API
- eles usam `setInterval(...)`
- alguns disparam uma execução imediata no boot com `tick()`
- se a API cair, os jobs param junto
- quando a API volta, os jobs voltam a agendar do zero

O bootstrap atual acontece em [`backend/src/app.ts`](../backend/src/app.ts):

1. carrega env/SSM
2. inicializa o banco
3. roda `runMigrations()`
4. registra middlewares e rotas
5. chama os `schedule...Job()`

Ou seja: **os jobs só começam depois que o banco e a API estão prontos**.

## Padrão usado no projeto

Os jobs atuais seguem quase sempre este formato:

1. criar um arquivo em `backend/src/jobs`
2. importar `logger`
3. ler flags/envs para `enabled` e `intervalMs`
4. abortar cedo se o job estiver desabilitado
5. declarar um `tick` assíncrono
6. capturar erro dentro do `tick` para não derrubar a API
7. chamar `setInterval(tick, intervalMs)`
8. opcionalmente disparar `tick()` no boot

Template base:

```ts
import { logger } from '../utils/logger';

const log = logger.child({ scope: 'ExampleJob' });

export function scheduleExampleJob() {
  const enabled = process.env.EXAMPLE_JOB_ENABLED !== 'false';
  const intervalMs =
    process.env.EXAMPLE_JOB_INTERVAL_MS && Number(process.env.EXAMPLE_JOB_INTERVAL_MS) > 0
      ? Number(process.env.EXAMPLE_JOB_INTERVAL_MS)
      : 5 * 60 * 1000;

  if (!enabled) {
    log.info('Example job disabled');
    return;
  }

  const tick = async () => {
    try {
      // trabalho do job
    } catch (error: any) {
      log.warn('Example job tick failed', { error: error?.message || String(error) });
    }
  };

  setInterval(tick, intervalMs);
  void tick();
  log.info('Example job scheduled', { intervalMs });
}
```

## Jobs existentes

### 1. Subscription expiration

Arquivo: [`backend/src/jobs/subscription-expiration.job.ts`](../backend/src/jobs/subscription-expiration.job.ts)

- Função: atualizar status de assinaturas
- Frequência padrão: `24h`
- Serviço usado: `SubscriptionService.updateStatusesForAll()`
- Observação: este job ainda usa um padrão mais antigo e não expõe env próprio de intervalo

### 2. Delivery expiration

Arquivo: [`backend/src/jobs/delivery-expiration.job.ts`](../backend/src/jobs/delivery-expiration.job.ts)

- Função: expirar entregas disponíveis que passaram de `expires_at`
- Frequência padrão: `2 min`
- Variáveis:
  - `DELIVERY_EXPIRATION_JOB_ENABLED`
  - `DELIVERY_EXPIRATION_INTERVAL_MS`
- Comportamento: roda no boot e depois em intervalo fixo

### 3. Face verify

Arquivo: [`backend/src/jobs/face-verify.job.ts`](../backend/src/jobs/face-verify.job.ts)

- Função: processar fila de verificação facial assistida do motoboy
- Frequência padrão: `30 s`
- Variáveis:
  - `FACE_VERIFY_JOB_ENABLED`
  - `FACE_VERIFY_JOB_INTERVAL_MS`
- Detalhe: processa lote pequeno por tick para não monopolizar o processo

Veja também: [`docs/FACE_VERIFY.md`](./FACE_VERIFY.md)

### 4. Awaiting payment expiration

Arquivo: [`backend/src/jobs/awaiting-payment-expiration.job.ts`](../backend/src/jobs/awaiting-payment-expiration.job.ts)

- Função: cancelar pedidos presos em `awaiting_payment`
- Frequência padrão: `2 min`
- Janela padrão: `40 min`
- Variáveis:
  - `AWAITING_PAYMENT_EXPIRATION_JOB_ENABLED`
  - `AWAITING_PAYMENT_EXPIRATION_INTERVAL_MS`
  - `AWAITING_PAYMENT_EXPIRATION_THRESHOLD_MINUTES`
- Detalhe: além de cancelar o pedido, também atualiza `order_payments`

### 5. Store dashboard snapshot

Arquivo: [`backend/src/jobs/store-dashboard-snapshot.job.ts`](../backend/src/jobs/store-dashboard-snapshot.job.ts)

- Função: consolidar snapshots diários do dashboard por loja
- Frequência padrão: `10 min`
- Variáveis:
  - `STORE_DASHBOARD_SNAPSHOT_JOB_ENABLED`
  - `STORE_DASHBOARD_SNAPSHOT_INTERVAL_MS`
  - `STORE_DASHBOARD_SNAPSHOT_MAX_DATES`
- Serviço usado: [`backend/src/services/StoreDashboardSnapshotService.ts`](../backend/src/services/StoreDashboardSnapshotService.ts)
- Estratégia:
  - detecta dias “sujos” com base em `orders.updated_at`
  - recalcula só os dias afetados
  - persiste em:
    - `store_dashboard_daily_metrics`
    - `store_dashboard_daily_products`

## Regras práticas para criar um novo job

### 1. Prefira idempotência

Um job bom deve poder rodar duas vezes sem corromper dado.

Exemplos:

- `UPDATE ... WHERE status = 'X'`
- `INSERT ... ON CONFLICT ...`
- apagar e recompor uma janela delimitada

### 2. Não deixe erro escapar do `tick`

Se o erro sair do `setInterval`, você perde previsibilidade operacional.

Padrão esperado:

```ts
try {
  // trabalho
} catch (error: any) {
  log.warn('Job tick failed', { error: error?.message || String(error) });
}
```

### 3. Faça o trabalho em lotes

Evite jobs que tentam processar tudo de uma vez.

Prefira:

- limites por tick
- lotes pequenos
- reentrada segura no próximo ciclo

### 4. Tenha flag para desligar

O padrão do projeto hoje é:

```ts
const enabled = process.env.MEU_JOB_ENABLED !== 'false';
```

Isso permite desligar rápido em produção sem remover código.

### 5. Tenha intervalo configurável

Sempre exponha `*_INTERVAL_MS` quando o job não for estritamente fixo.

### 6. Logue início, desabilitação e falha

Mínimo esperado:

- `job disabled`
- `job scheduled`
- `tick failed`

### 7. Se depender de banco, registre depois do bootstrap

No projeto atual, os jobs são chamados só depois de:

- `AppDataSource.initialize()`
- `ensureBaseSchema(...)`
- `runMigrations()`

Isso evita job rodando antes da estrutura necessária existir.

## Limitações do modelo atual

Hoje os jobs são **in-process**, então existem algumas implicações:

- se existir mais de uma instância da API, cada instância roda os jobs também
- não existe lock distribuído por padrão
- se um job precisar exclusividade global, vai precisar de `advisory lock`, fila, ou outro mecanismo de coordenação

Para o ambiente atual, com a API rodando num fluxo operacional simples, isso é aceitável. Se houver scale horizontal no futuro, revisar esse ponto.

## Quando usar job e quando não usar

Use job quando:

- a tarefa é recorrente
- pode ser eventual
- não precisa responder dentro da request do usuário
- vale mais consolidar em lote do que recalcular toda hora

Não use job quando:

- a ação precisa acontecer exatamente dentro da transação do pedido
- o usuário depende da resposta imediata da operação
- a consistência precisa ser síncrona e estrita

## Checklist para novo job

- criar arquivo em `backend/src/jobs`
- criar função `schedule...Job()`
- adicionar `logger.child({ scope: '...' })`
- adicionar env de `enabled`
- adicionar env de `interval`
- garantir `try/catch` dentro do `tick`
- decidir se roda `tick()` no boot
- registrar o job em [`backend/src/app.ts`](../backend/src/app.ts)
- se gravar em banco, garantir migration idempotente antes
- validar com `npm --prefix backend run build`
