import { TypeScriptGenerator, TS_COMMON_PRESET } from '@asyncapi/modelina';
import fs from 'node:fs';
import path from 'node:path';

const modelGenerator = new TypeScriptGenerator({
    modelType: 'interface',
    enumType: 'union',
    rawPropertyNames: true,
});

async function generate() {
    console.log('🚀 Generando cliente de AsyncAPI...');

    const asyncApiPath = path.join(process.cwd(), 'src', 'api', 'asyncapi.json');
    if (!fs.existsSync(asyncApiPath)) {
        console.error(`Espec de AsyncAPI no encontrado en ${asyncApiPath}`);
        return;
    }

    const asyncapi = JSON.parse(fs.readFileSync(asyncApiPath, 'utf8'));
    const outputDir = path.join(process.cwd(), 'src', 'api', 'generated', 'asyncapi');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. GENERAR MODELOS (Modelina)
    const models = await modelGenerator.generate(asyncapi);
    let modelsOutput = '/** ESTE ARCHIVO HA SIDO GENERADO AUTOMÁTICAMENTE POR MODELINA. NO EDITAR. */\n\n';

    for (const model of models) {
        let content = model.result;
        modelsOutput += (content.startsWith('export') ? content : 'export ' + content) + '\n\n';
    }
    fs.writeFileSync(path.join(outputDir, 'models.ts'), modelsOutput);


    // 2. GENERAR HOOKS
    let hooksOutput = `/** ESTE ARCHIVO HA SIDO GENERADO AUTOMÁTICAMENTE. NO EDITAR. */
import { useMutation } from '@tanstack/react-query';
import { useRef, useState, useCallback } from 'react';
import type { AxiosProgressEvent } from 'axios';
import * as Models from './models';
import { customInstance } from '../../axios-instance';

`;

    const channels = asyncapi.channels || {};
    for (const [channelPath, channel] of Object.entries(channels)) {
        const channelObj = channel as any;
        const protocol = channelObj['x-protocol'] || 'sse';

        const baseName = channelPath
            .split('/')
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');

        const mutationName = baseName.charAt(0).toLowerCase() + baseName.slice(1);

        if (protocol === 'ws') {
            const subMessageRef = channelObj.subscribe?.message?.$ref || channelObj.subscribe?.message?.oneOf?.[0]?.$ref;
            const pubMessageRef = channelObj.publish?.message?.$ref || channelObj.publish?.message?.oneOf?.[0]?.$ref;

            const typeOut = subMessageRef ? subMessageRef.split('/').pop() : 'never';
            const typeIn = pubMessageRef ? pubMessageRef.split('/').pop() : 'never';

            hooksOutput += `
/**
 * Hook para el canal WebSocket ${channelPath}
 * Recibe (onMessage): Models.${typeOut}
 * Envía (send): Models.${typeIn}
 */
export const use${baseName}WS = (onMessage?: (data: Models.${typeOut}) => void) => {
    const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('closed');
    const ws = useRef<WebSocket | null>(null);
    const isExplicitlyClosed = useRef(false);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const onMessageRef = useRef(onMessage);

    // Sincronizar el ref con el callback más reciente sin disparar reconexiones
    onMessageRef.current = onMessage;

    const connect = useCallback(() => {
        // Guard against already-open OR already-connecting sockets to avoid duplicate connections
        if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) return;
        isExplicitlyClosed.current = false;
        
        const baseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL || window.location.origin;
        const apiHost = baseUrl.startsWith('/')
            ? \`\${window.location.host}\${baseUrl}\` 
            : baseUrl.replace(/^http(s?):\\/\\//, '');
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = \`\${wsProtocol}//\${apiHost.replace(/\\/$/, '')}${channelPath}\`;

        const socket = new WebSocket(socketUrl);
        ws.current = socket;
        setStatus('connecting');

        socket.onopen = () => {
            if (ws.current === socket) setStatus('open');
        };

        socket.onclose = () => {
            if (ws.current === socket) {
                setStatus('closed');
                if (!isExplicitlyClosed.current) {
                    reconnectTimeout.current = setTimeout(connect, 3000);
                }
            }
        };
        socket.onmessage = (event) => {
            if (onMessageRef.current) {
                try {
                    onMessageRef.current(JSON.parse(event.data));
                } catch (e) {
                    console.error('Error parsing WS message:', e);
                }
            }
        };
    }, []); // Eliminamos onMessage de las dependencias

    const send = useCallback((data: Models.${typeIn}) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
        } else {
            console.warn('[WS] send() llamado pero el WebSocket no está abierto (readyState:', ws.current?.readyState, '). Mensaje descartado.');
        }
    }, []);

    const disconnect = useCallback(() => {
        isExplicitlyClosed.current = true;
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        if (ws.current) {
            const socket = ws.current;
            // Nullify handlers before closing to prevent stale state updates
            socket.onopen = null;
            socket.onmessage = null;
            socket.onclose = null;
            socket.onerror = null;
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close();
            }
            ws.current = null;
            setStatus('closed');
        }
    }, []);

    return { connect, disconnect, send, status };
};
`;
        } else {
            const subMessageRef = channelObj.subscribe?.message?.$ref || channelObj.subscribe?.message?.oneOf?.[0]?.$ref;
            const eventType = subMessageRef ? subMessageRef.split('/').pop() : 'never';

            const pubMessageRef = channelObj.publish?.message?.$ref || channelObj.publish?.message?.oneOf?.[0]?.$ref;
            const bodyType = pubMessageRef ? pubMessageRef.split('/').pop() : 'never';

            hooksOutput += `
export const get${baseName}MutationKey = () => ['${mutationName}'];

/**
 * Hook Mutation para el canal SSE ${channelPath}
 * Cuerpo (body): Models.${bodyType}
 * Eventos (onEvent): Models.${eventType}
 */
export const use${baseName}Mutation = () => {
    return useMutation({
        mutationKey: get${baseName}MutationKey(),
        mutationFn: async ({ body, onEvent, onError, signal }: { 
            body: Models.${bodyType}, 
            onEvent: (event: Models.${eventType}) => void, 
            onError?: (error: Error) => void,
            signal?: AbortSignal
        }) => {
            let lastProcessedLength = 0;
            
            try {
                const response = await customInstance({
                    url: \`${channelPath}\`,
                    method: 'POST',
                    data: body,
                    headers: {
                        'Accept': 'text/event-stream',
                    },
                    signal: signal,
                    onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
                        const xhr = progressEvent.event.target as XMLHttpRequest;
                        const fullText = xhr.responseText;
                        const lastBoundary = fullText.lastIndexOf('\\n\\n');
                        if (lastBoundary === -1 || lastBoundary < lastProcessedLength) return;

                        const completeText = fullText.substring(lastProcessedLength, lastBoundary);
                        lastProcessedLength = lastBoundary + 2;

                        const events = completeText.split('\\n\\n');
                        for (const event of events) {
                            const eventContent = event.trim();
                            if (eventContent.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(eventContent.replace('data: ', ''));
                                    onEvent(data);
                                } catch (e) {
                                    console.error("Error parsing SSE event:", e, eventContent);
                                }
                            }
                        }
                    }
                });

                return response;
            } catch (err: unknown) {
                if (err instanceof Error) {
                    if (err.name === 'CanceledError' || err.name === 'AbortError') return;
                    if (onError) onError(err);
                }
                throw err;
            }
        }
    });
};
`;
        }
    }

    fs.writeFileSync(path.join(outputDir, 'hooks.ts'), hooksOutput);
    console.log(`✨ Cliente de AsyncAPI generado.`);
}

generate().catch(console.error);
