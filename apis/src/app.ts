// Deploy validation trigger v3 - 2026-05-04 21:22
import express from 'express';
import { InMemoryTransporter } from './bus/transporters/in-memory.transporter';
import { CommandProducer } from './bus/command-producer';
import { CommandBroker } from './bus/command-broker';
import { registerStoreProcessors } from './processors/store.processor';
import { registerOrderProcessors } from './processors/order.processor';
import { registerAuthProcessors } from './processors/auth.processor';
import { registerCustomerProcessors } from './processors/customer.processor';
import { createOrderRoutes } from './domains/orders/orders.routes';
import { createAuthRoutes } from './domains/auth/auth.routes';
import { createCustomerRoutes } from './domains/customer/customer.routes';
import { createProxyRoutes } from './domains/proxy/proxy.routes';
import { errorMiddleware } from './middleware/error.middleware';

const transporter = new InMemoryTransporter();
const producer = new CommandProducer(transporter);
const broker = new CommandBroker(transporter);

registerStoreProcessors(transporter);
registerOrderProcessors(transporter);
registerAuthProcessors(transporter);
registerCustomerProcessors(transporter);

const app = express();
app.use(express.json({ limit: '5mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Redirects permanentes de slug de loja (21/08) ────────────────────────────
// Na produção o /api vai do nginx da EC2 DIRETO pro BFF (não passa pelo nginx
// do frontend, que só cobre páginas) — o redirect de API mora AQUI. 308
// preserva método+body: drafts de checkout no localStorage de clientes que
// ainda chamam o slug antigo continuam funcionando.
const STORE_SLUG_REDIRECTS: Record<string, string> = {
  'edsertaneja': 'espetinho-datony-bacabal',
};
const storeSlugRedirectRegex = /^\/((?:api|v1)\/(?:public\/)?stores\/slug\/)([^/?]+)(\/[^?]*)?/;
app.use((req, res, next) => {
  const match = storeSlugRedirectRegex.exec(req.originalUrl.split('?')[0]);
  if (!match) return next();
  const target = STORE_SLUG_REDIRECTS[match[2]];
  if (!target) return next();
  const queryString = req.originalUrl.includes('?') ? `?${req.originalUrl.split('?')[1]}` : '';
  res.redirect(308, `/${match[1]}${target}${match[3] || ''}${queryString}`);
});

// Mount on both /v1 (new) and /api (backward compat with frontend)
// NOTE: dedicated domain routes (auth, customer, orders) go BEFORE proxy.
// Store routes removed from dedicated — they conflict with /stores/:storeId/* proxy routes.
// The proxy handles ALL /stores/* routes correctly.
for (const prefix of ['/v1', '/api']) {
    app.use(`${prefix}/orders`, createOrderRoutes(producer));
    app.use(`${prefix}/auth`, createAuthRoutes(producer));
    app.use(`${prefix}/customer`, createCustomerRoutes(producer));
    app.use(prefix, createProxyRoutes());
}

app.use(errorMiddleware);

export { app, broker };
