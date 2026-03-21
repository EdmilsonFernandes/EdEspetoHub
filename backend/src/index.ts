import { App } from './app';

(App as typeof App & { start(): Promise<void> }).start();