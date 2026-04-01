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
import { useEffect, useRef, useState, useCallback } from 'react';
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

    const connect = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) return;
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; 
        const url = \`\${protocol}//\${host}${channelPath}\`;
        
        ws.current = new WebSocket(url);
        setStatus('connecting');

        ws.current.onopen = () => setStatus('open');
        ws.current.onclose = () => setStatus('closed');
        ws.current.onmessage = (event) => {
            if (onMessage) {
                try {
                    onMessage(JSON.parse(event.data));
                } catch (e) {
                    console.error('Error parsing WS message:', e);
                }
            }
        };
    }, [onMessage]);

    const send = useCallback((data: Models.${typeIn}) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
        }
    }, []);

    const disconnect = useCallback(() => {
        ws.current?.close();
    }, []);

    useEffect(() => {
        return () => disconnect();
    }, [disconnect]);

    return { connect, disconnect, send, status };
};
`;
        } else {
            const subMessageRef = channelObj.subscribe?.message?.$ref || channelObj.subscribe?.message?.oneOf?.[0]?.$ref;
            const eventType = subMessageRef ? subMessageRef.split('/').pop() : 'never';

            const pubMessageRef = channelObj.publish?.message?.$ref || channelObj.publish?.message?.oneOf?.[0]?.$ref;
            const bodyType = pubMessageRef ? pubMessageRef.split('/').pop() : 'never';

            hooksOutput += `
/**
 * Hook Mutation para el canal SSE ${channelPath}
 * Cuerpo (body): Models.${bodyType}
 * Eventos (onEvent): Models.${eventType}
 */
export const use${baseName}Mutation = () => {
    return useMutation({
        mutationFn: async ({ body, onEvent, onError }: { 
            body: Models.${bodyType}, 
            onEvent: (event: Models.${eventType}) => void, 
            onError?: (error: Error) => void 
        }) => {
            const ctrl = new AbortController();
            let lastProcessedLength = 0;
            
            try {
                const response = await customInstance({
                    url: \`${channelPath}\`,
                    method: 'POST',
                    data: body,
                    headers: {
                        'Accept': 'text/event-stream',
                    },
                    signal: ctrl.signal,
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
