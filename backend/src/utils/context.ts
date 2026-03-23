import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
    ip: string;
    userAgent: string;
    userId?: string | null;
}

export const contextStorage = new AsyncLocalStorage<RequestContext>();
