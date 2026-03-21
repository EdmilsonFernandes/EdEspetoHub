import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
  route?: string;
}

export const requestContextStore = new AsyncLocalStorage<RequestContext>();