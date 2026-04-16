import 'reflect-metadata';

export const ASYNC_METADATA = {
    CONTROLLER: 'asyncapi:controller',
    CHANNEL: 'asyncapi:channel',
    MESSAGE: 'asyncapi:messages',
};

export function AsyncAPIController(path: string = ''): ClassDecorator {
    return (target: any) => {
        Reflect.defineMetadata(ASYNC_METADATA.CONTROLLER, path, target);
    };
}

// Firma para WebSockets: El primer parámetro DEBE ser compatible con WebSocket
export type WSHandler = (ws: any, ...args: any[]) => any;


// Firma para SSE/HTTP: El retorno DEBE ser un AsyncGenerator
export type SSEHandler = (...args: any[]) => AsyncGenerator<any, any, any> | Promise<AsyncGenerator<any, any, any>>;




/**
 * Decorador para definir un canal de comunicación asíncrona.
 */
// Sobrecarga 1: WebSockets
export function AsyncAPIChannel<T extends WSHandler>(
    path: string, 
    options: { protocol: 'ws', summary?: string, description?: string, security?: string }
): (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => void;

// Sobrecarga 2: SSE / HTTP (Por defecto)
export function AsyncAPIChannel<T extends SSEHandler>(
    path: string, 
    options?: { protocol?: 'sse' | 'http', summary?: string, description?: string, method?: 'POST' | 'GET', security?: string }
): (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => void;


// Implementación real
export function AsyncAPIChannel(
    path: string, 
    options?: { protocol?: 'ws' | 'http' | 'sse', summary?: string, description?: string, method?: 'POST' | 'GET', security?: string }
) {
    return (
        target: any, 
        propertyKey: string | symbol, 
        descriptor: PropertyDescriptor
    ) => {
        Reflect.defineMetadata(ASYNC_METADATA.CHANNEL, { path, ...options }, target, propertyKey);
    };
}

export function AsyncAPIMessage(type: 'publish' | 'subscribe', messageType?: any): MethodDecorator {
    return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        const existingMessages = Reflect.getMetadata(ASYNC_METADATA.MESSAGE, target, propertyKey) || [];
        existingMessages.push({ type, messageType });
        Reflect.defineMetadata(ASYNC_METADATA.MESSAGE, existingMessages, target, propertyKey);
    };
}

