import { WebSocket } from 'ws';

/**
 * Interface para un WebSocket 100% tipado en ambas direcciones.
 * @template TIn - El tipo de mensaje que RECIBES del cliente.
 * @template TOut - El tipo de mensaje que ENVIÁS al cliente.
 */
export interface TypedWebSocket<TIn, TOut> extends Omit<WebSocket, 'on' | 'send'> {
    /**
     * Envía un mensaje tipado al cliente.
     */
    send(data: TOut | string | Buffer | ArrayBuffer | number | any[]): void;

    /**
     * Helper para recibir mensajes ya parseados y tipados. 
     * El generador de rutas se encargará de inyectar esta lógica.
     */
    onMessage(cb: (data: TIn) => void): void;

    on(event: 'message', cb: (data: string) => void): this;

    on(event: 'close', cb: () => void): this;
    on(event: 'error', cb: (err: Error) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
}

/**
 * Envuelve un WebSocket estándar de 'ws' para añadirle soporte para TypedWebSocket.
 */
export function wrapWebSocket<TIn, TOut>(ws: WebSocket): TypedWebSocket<TIn, TOut> {
    const typedWs = ws as unknown as TypedWebSocket<TIn, TOut>;

    // Inyectamos onMessage para facilitar el recibo de datos JSON
    typedWs.onMessage = (cb: (data: TIn) => void) => {
        ws.on('message', (data: { toString: () => string }) => {
            try {
                const parsed = JSON.parse(data.toString());
                cb(parsed);
            } catch (e) {
                console.error('Error parseando WebSocket JSON:', e);
            }
        });
    };

    return typedWs;
}
