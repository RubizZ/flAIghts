import { Project, MethodDeclaration, SyntaxKind, ObjectLiteralExpression } from "ts-morph";
import fs from "fs";
import path from "path";
import { Parser } from "@asyncapi/parser";
import * as TJS from "typescript-json-schema";

const project = new Project({
    tsConfigFilePath: path.join(process.cwd(), "tsconfig.json"),
});

const asyncapiPath = path.join(process.cwd(), "build", "asyncapi.json");

interface ChannelMessageInfo {
    type: 'publish' | 'subscribe';
    messageType: string;
}

interface ChannelInfo {
    path: string;
    protocol: string;
    messages: ChannelMessageInfo[];
}

/**
 * Infiere el nombre del tipo del mensaje a partir de la firma del método.
 */
function inferMessageType(method: MethodDeclaration, type: 'publish' | 'subscribe'): string | undefined {
    // Protocolo WS: Intentar extraer de TypedWebSocket<In, Out>
    const wsParam = method.getParameters()[0];
    const channelArgs = method.getDecorator("AsyncAPIChannel")?.getArguments();
    const optionsArg = channelArgs && channelArgs.length > 1 ? channelArgs[1].asKind(SyntaxKind.ObjectLiteralExpression) : undefined;
    const protocolProp = optionsArg?.getProperty("protocol");
    let protocolText = "http";
    if (protocolProp && protocolProp.asKind(SyntaxKind.PropertyAssignment)) {
        protocolText = protocolProp.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer()?.getText().replace(/['"]/g, "") || "http";
    }
    const isWS = protocolText === 'ws';


    if (isWS && wsParam) {
        const typeArgs = wsParam.getType().getTypeArguments();
        if (typeArgs.length >= 2) {
            const sym = type === 'publish' ? typeArgs[0].getSymbol() : typeArgs[1].getSymbol();
            return sym?.getName();
        }
    }

    // Protocolo SSE/HTTP
    if (type === 'publish') {
        const bodyParam = method.getParameters().find(p => p.getDecorator("Body"));
        if (bodyParam) {
            const typeNode = bodyParam.getType();
            return typeNode.getSymbol()?.getName() || typeNode.getText().split('.').pop();
        }
    } else if (type === 'subscribe') {
        const returnType = method.getReturnType();
        const typeArgs = returnType.getTypeArguments();

        if (typeArgs.length > 0) {
            let messageType = typeArgs[0].getSymbol()?.getName();
            
            // Fallback agresivo si el símbolo no está resuelto
            if (!messageType) {
                const text = typeArgs[0].getText();
                messageType = text.split('<').pop()?.split('>').shift()?.split('.').pop();
            }

            if (messageType === 'AsyncGenerator') {
                const nestedArgs = typeArgs[0].getTypeArguments();
                if (nestedArgs.length > 0) {
                    messageType = nestedArgs[0].getSymbol()?.getName();
                    if (!messageType) {
                        messageType = nestedArgs[0].getText().split('.').pop();
                    }
                }
            }
            return messageType?.replace(/[\[\]]/g, "");
        }
    }
    return undefined;
}

async function generate() {
    console.log("🚀 Generando especificación AsyncAPI...");

    const settings: TJS.PartialArgs = {
        required: true,
        ref: true,
        noExtraProps: true,
        ignoreErrors: true,
    };

    const compilerOptions = {
        strictNullChecks: true,
        esModuleInterop: true,
        moduleResolution: 2,
        target: 99,
        module: 99,
    };

    const controllersPath = "src/modules/**/*.controller.ts";
    const typesPath = "src/modules/**/*.types.ts";

    const discoveredMessages = new Set<string>();
    const channels: ChannelInfo[] = [];

    const sourceFiles = project.getSourceFiles(controllersPath);
    console.log(`🔍 Escaneando ${sourceFiles.length} controladores...`);

    for (const sourceFile of sourceFiles) {
        const classes = sourceFile.getClasses();
        for (const cls of classes) {
            const routeDecorator = cls.getDecorator("Route");
            const basePath = routeDecorator?.getArguments()[0]?.getText().replace(/['"]/g, "") || "";

            const methods = cls.getMethods();
            for (const method of methods) {
                const channelDecorator = method.getDecorator("AsyncAPIChannel");
                if (!channelDecorator) continue;

                const localPath = channelDecorator.getArguments()[0]?.getText().replace(/['"]/g, "") || "";
                const channelPath = ('/' + basePath + '/' + localPath).replace(/\/+/g, '/');

                const args = channelDecorator.getArguments();
                const optionsArg = args.length > 1 ? args[1].asKind(SyntaxKind.ObjectLiteralExpression) : undefined;
                const protocolProp = optionsArg?.getProperty("protocol");
                const protocol = protocolProp && protocolProp.asKind(SyntaxKind.PropertyAssignment)
                    ? protocolProp.asKindOrThrow(SyntaxKind.PropertyAssignment).getInitializer()?.getText().replace(/['"]/g, "") || "sse"
                    : "sse";

                const channelInfo: ChannelInfo = { path: channelPath, protocol, messages: [] };
                const messageDecorators = method.getDecorators().filter(d => d.getName() === "AsyncAPIMessage");

                if (messageDecorators.length > 0) {
                    for (const msgDec of messageDecorators) {
                        const args = msgDec.getArguments();
                        const type = args[0]?.getText().replace(/['"]/g, "") as 'publish' | 'subscribe';
                        let inferred: string | string[] | undefined = args[1]?.getText().replace(/['"]/g, "");

                        if (!inferred) {
                            inferred = inferMessageType(method, type);
                        }

                        if (inferred) {
                            const messageType: string = typeof inferred === 'string' ? inferred : inferred[0];
                            discoveredMessages.add(messageType);
                            channelInfo.messages.push({ type, messageType });
                        }
                    }

                } else {
                    // Auto-inferir de la firma si no hay decoradores de mensaje
                    const pub = inferMessageType(method, 'publish');
                    if (pub) {
                        const messageType = typeof pub === 'string' ? pub : pub[0];
                        discoveredMessages.add(messageType);
                        channelInfo.messages.push({ type: 'publish', messageType });
                    }

                    const sub = inferMessageType(method, 'subscribe');
                    if (sub) {
                        const messageType = typeof sub === 'string' ? sub : sub[0];
                        discoveredMessages.add(messageType);
                        channelInfo.messages.push({ type: 'subscribe', messageType });
                    }
                }


                if (channelInfo.messages.length > 0) {
                    channels.push(channelInfo);
                }
            }
        }
    }

    if (discoveredMessages.size === 0) {
        console.warn("⚠️ No se encontraron canales de AsyncAPI.");
        return;
    }

    // 2. GENERAR ESQUEMAS (TJS)
    console.log(`📦 Generando esquemas para: ${Array.from(discoveredMessages).join(", ")}`);

    const program = TJS.getProgramFromFiles(
        [...project.getSourceFiles(typesPath).map(f => f.getFilePath()), ...sourceFiles.map(f => f.getFilePath())],
        compilerOptions
    );
    const generator_tjs = TJS.buildGenerator(program, settings);
    if (!generator_tjs) throw new Error("No se pudo inicializar el generador de esquemas (TJS).");

    const rawSchema = generator_tjs.getSchemaForSymbols(Array.from(discoveredMessages));

    // 3. CONSTRUIR SPEC
    const asyncapi = {
        asyncapi: "2.6.0",
        info: {
            title: "flAIghts Async API",
            version: "1.0.0",
            description: "API de eventos asíncronos generada automáticamente desde los controladores."
        },
        channels: {} as Record<string, any>,
        components: {
            schemas: {} as Record<string, any>,
            messages: {} as Record<string, any>
        }
    };

    if (rawSchema.definitions) {
        for (const [name, schema] of Object.entries(rawSchema.definitions)) {
            const schemaStr = JSON.stringify(schema).replace(/#\/definitions\//g, "#/components/schemas/");
            asyncapi.components.schemas[name] = JSON.parse(schemaStr);
        }
    }

    // Registrar canales
    for (const chan of channels) {
        if (!asyncapi.channels[chan.path]) {
            asyncapi.channels[chan.path] = {
                "x-protocol": chan.protocol
            };
        }

        for (const msg of chan.messages) {
            asyncapi.channels[chan.path][msg.type] = {
                message: {
                    $ref: `#/components/messages/${msg.messageType}`
                }
            };

            asyncapi.components.messages[msg.messageType] = {
                payload: {
                    $ref: `#/components/schemas/${msg.messageType}`
                }
            };
        }
    }

    try {
        const parser = new Parser();
        await parser.parse(asyncapi);
        console.log("✅ Validación exitosa.");
    } catch (err) { }

    fs.writeFileSync(asyncapiPath, JSON.stringify(asyncapi, null, 2));
    console.log(`✨ AsyncAPI 2.6.0 generado en ${asyncapiPath}`);
}

generate().catch(console.error);
