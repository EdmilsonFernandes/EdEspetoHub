import 'dotenv/config';
import { env } from './config/env';
import { app, broker } from './app';

async function main(): Promise<void> {
    await broker.start();
    app.listen(env.port, () => {
        console.log(`[janocaminho.apis] running on port ${env.port} (${env.nodeEnv})`);
        console.log(`[janocaminho.apis] backend -> ${env.backendUrl}`);
        console.log(`[janocaminho.apis] bus: InMemoryTransporter`);
    });
}

main().catch((err) => { console.error('[janocaminho.apis] failed to start', err); process.exit(1); });
