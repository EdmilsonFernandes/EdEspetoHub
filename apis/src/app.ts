// Deploy validation trigger v2 - 2026-05-04 21:17
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
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

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
