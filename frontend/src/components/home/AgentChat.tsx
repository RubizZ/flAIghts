import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Send, Sparkles, User, ExternalLink, Plane, MapPin, Calendar, Clock, ArrowRight, Check, Square, ChevronRight, ChevronDown, Lock, AlertCircle } from "lucide-react";

import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";
import { Link } from "react-router-dom";
import type {
    SearchResponseData,
    ItineraryResponse,
    AirportResponse
} from "@/api/generated/asyncapi/models";
import { useAuth } from "@/context/AuthContext";
import { useUserLocation } from "@/context/UserLocationContext";
import { getAirportByIata } from "@/api/generated/openapi/airports";
import { useModels } from "@/api/generated/openapi/agent";
import { useAgentStreamMutation } from "@/api/generated/asyncapi/hooks";
import * as AsyncAPIModels from "@/api/generated/asyncapi/models";

/**
 * Tipo para soportar mensajes de chat extendidos con streaming y razonamiento.
 */
export type ExtendedChatMessage =
    | (AsyncAPIModels.AssistantRequestMessage & {
        isStreaming?: boolean;
        flights?: AsyncAPIModels.SearchResponseData[];
        steps?: UIStep[];
        isLimitReached?: boolean;
    })
    | {
        role: "reasoning";
        content: string;
        steps: UIStep[];
        isStreaming?: boolean;
        isLimitReached?: boolean;
    };

type UIStep = AsyncAPIModels.AgentStreamEvent & {
    result?: unknown;
    status?: string;
    progress?: any;
};

interface AgentChatProps {
    messages: ExtendedChatMessage[];
    setMessages: (messages: ExtendedChatMessage[] | ((prev: ExtendedChatMessage[]) => ExtendedChatMessage[])) => void;
    origins?: AirportResponse[];
    destinations?: AirportResponse[];
    departureDate?: string;
    returnDate?: string;
    setOrigins?: (airports: AirportResponse[]) => void;
    setDestinations?: (airports: AirportResponse[]) => void;
    setDepartureDate?: (date: string) => void;
    setReturnDate?: (date: string) => void;
}


const Typewriter = ({ text, speed = 15, onComplete }: { text: string; speed?: number; onComplete?: () => void }) => {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        setDisplayedText("");
        let i = 0;
        const timer = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) {
                clearInterval(timer);
                onComplete?.();
            }
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed]);

    return (
        <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-brand prose-strong:font-bold prose-headings:text-content prose-code:text-brand prose-code:bg-brand/10 prose-code:px-1 prose-code:rounded">
            <ReactMarkdown>{displayedText}</ReactMarkdown>
        </div>
    );
};

const FlightCard = ({ search }: { search: SearchResponseData }) => {
    if (!search.departure_itineraries || search.departure_itineraries.length === 0) return null;

    const itinerary = search.departure_itineraries[0] as ItineraryResponse;
    const firstLeg = itinerary.legs[0];
    const lastLeg = itinerary.legs[itinerary.legs.length - 1];

    return (
        <Link
            to={`/search/${search._id}`}
            className="block group bg-surface/40 hover:bg-surface/60 border border-line/30 hover:border-brand/40 rounded-2xl p-4 transition-all duration-300 shadow-sm hover:shadow-md backdrop-blur-md"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center border border-brand/20">
                        {firstLeg?.airline_logo ? (
                            <img src={firstLeg.airline_logo} alt={firstLeg.airline} className="w-6 h-6 object-contain" />
                        ) : (
                            <Plane size={18} className="text-brand" />
                        )}
                    </div>
                    <div>
                        <p className="text-[10px] text-content-muted uppercase font-bold tracking-wider">{firstLeg?.airline}</p>
                        <p className="text-xs font-bold text-content">Vuelo Recomendado</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-brand tracking-tight">{itinerary.total_price}€</p>
                    <p className="text-[10px] text-content-muted font-bold tracking-tighter uppercase">Precio Total</p>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 mb-4 relative">
                <div className="flex-1">
                    <p className="text-xl font-black text-content">{firstLeg?.origin}</p>
                    <p className="text-[10px] text-content-muted font-bold tracking-wider uppercase">{firstLeg?.departure_time.split('T')[1]?.substring(0, 5)}</p>
                </div>

                <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full h-px bg-linear-to-r from-transparent via-brand/40 to-transparent relative">
                        <ArrowRight size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand" />
                    </div>
                    <p className="text-[9px] text-content-muted font-bold bg-surface/50 px-2 py-0.5 rounded-full border border-line/20">
                        {Math.floor(itinerary.total_duration / 60)}h {itinerary.total_duration % 60}m
                    </p>
                </div>

                <div className="flex-1 text-right">
                    <p className="text-xl font-black text-content">{lastLeg?.destination}</p>
                    <p className="text-[10px] text-content-muted font-bold tracking-wider uppercase">{lastLeg?.arrival_time.split('T')[1]?.substring(0, 5)}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-line/20">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-main/30 rounded-lg text-[9px] font-bold text-content-muted">
                    <Calendar size={10} className="text-brand/60" />
                    <span>{new Date(search.departure_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-main/30 rounded-lg text-[9px] font-bold text-content-muted">
                    <MapPin size={10} className="text-brand/60" />
                    <span>{itinerary.legs.length > 1 ? `${itinerary.legs.length - 1} escalas` : "Directo"}</span>
                </div>
                <div className="ml-auto">
                    <div className="p-1.5 rounded-lg bg-brand text-content-on-brand group-hover:scale-110 transition-transform shadow-xs">
                        <ExternalLink size={12} />
                    </div>
                </div>
            </div>
        </Link>
    );
};

const getToolDescription = (step: UIStep) => {
    if (step.type === 'step') return step.message;
    if (step.type === 'tool_call') {
        // Si hay progreso activo, lo priorizamos en la descripción
        if (step.progress) {
            const pe = step.progress;
            if (pe.type === 'progress') return pe.message;
            if (pe.type === 'completed') return 'Búsqueda de vuelos completada';
            if (pe.type === 'failed') return `Error: ${pe.message}`;
        }

        switch (step.name) {
            case 'getUserInfo': return 'Accediendo a tu perfil...';
            case 'getUserSearchHistory': return 'Consultando tu historial...';
            case 'searchAirports': return `Localizando aeropuertos para "${step.args.query}"...`;
            case 'searchAirlines': return `Buscando aerolíneas para "${step.args.query}"...`;
            case 'performSearch': return `Rastreando vuelos desde ${step.args.origins.map(o => o).join(', ')} a ${step.args.destinations.map(d => d).join(', ')}...`;
        }
    }
    if (step.type === 'tool_result') {
        switch (step.name) {
            case 'getUserInfo': return `Datos obtenidos de tu perfil`;
            case 'getUserSearchHistory': return `Datos obtenidos de tu historial`;
            case 'searchAirports': return `Aeropuertos localizados con éxito`;
            case 'searchAirlines': return `Aerolíneas localizadas con éxito`;
            case 'performSearch': return `Búsqueda creada con éxito`;
        }
    }
    if (step.type === 'iteration') {
        return `Pensando...`;
    }
    if (step.type === 'tool_progress') {
        const progressEvent = step.event;
        if (progressEvent.type === 'progress') return progressEvent.message;
        if (progressEvent.type === 'completed') return 'Búsqueda completada';
        if (progressEvent.type === 'failed') return `Error: ${progressEvent.message}`;
        return 'Procesando...';
    }
    return null;
};

const getToolIcon = (name: string) => {
    switch (name) {
        case 'getUserInfo': return <User size={12} className="text-purple-400" />;
        case 'getUserSearchHistory': return <Clock size={12} className="text-purple-400" />;
        case 'searchAirports': return <MapPin size={12} className="text-orange-400" />;
        case 'searchAirlines': return <Plane size={12} className="text-brand" />;
        case 'performSearch': return <Plane size={12} className="text-brand" />;
        case 'getFlightSearchResults': return <Plane size={12} className="text-brand" />;

        default: return <Sparkles size={12} className="text-brand/60" />;
    }
};

const StepProgress = ({ steps }: { steps: any[] }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedResults, setExpandedResults] = useState<Record<number, boolean>>({});

    if (!steps || steps.length === 0) return null;

    // Filtrar iterations — tool_results ahora se usan para mostrar el resultado si estamos en DEV
    const filteredSteps = steps.filter(s => s.type !== 'iteration' && s.type !== 'tool_result');

    if (!filteredSteps || filteredSteps.length === 0) return null;

    // Result locator: priorities merged results (cleaner) then separate result events (legacy)
    const getResult = (stepIdx: number) => {
        const step = filteredSteps[stepIdx];
        if (step.type !== 'tool_call') return null;
        return step.result || steps.find(s => s.type === 'tool_result' && s.name === step.name)?.result;
    };

    const isCompleted = (stepIdx: number) => {
        const step = filteredSteps[stepIdx];
        return step.status === 'completed' || !!getResult(stepIdx);
    };

    const toggleResult = (e: React.MouseEvent, idx: number) => {
        e.stopPropagation();
        setExpandedResults(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const lastIdx = filteredSteps.length - 1;
    const lastStep = filteredSteps[lastIdx];
    const previousSteps = filteredSteps.slice(0, -1);

    const StepIcon = ({ step, completed }: { step: any; completed: boolean }) => {
        if (step.type === 'tool_call' || step.type === 'tool_progress') {
            return (
                <div className="relative shrink-0">
                    {getToolIcon(step.name)}
                    {completed && (
                        <div className="absolute -bottom-1.5 -right-1.5 w-2 h-2 rounded-full bg-green-500/90 flex items-center justify-center">
                            <Check size={5} className="text-white" strokeWidth={3.5} />
                        </div>
                    )}
                </div>
            );
        }
        return <div className="w-1.5 h-1.5 rounded-full bg-line/20 shrink-0" />;
    };

    const ActiveStepIcon = ({ step, done }: { step: any; done: boolean }) => {
        if (step.type === 'tool_call' || step.type === 'tool_progress') {
            return (
                <div className="relative shrink-0">
                    {getToolIcon(step.name)}
                    {done ? (
                        <div className="absolute -bottom-1.5 -right-1.5 w-2 h-2 rounded-full bg-green-500/90 flex items-center justify-center">
                            <Check size={5} className="text-white" strokeWidth={3.5} />
                        </div>
                    ) : (
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-brand/70 animate-pulse" />
                    )}
                </div>
            );
        }
        return <div className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-pulse shrink-0" />;
    };

    const ResultDisplay = ({ idx }: { idx: number }) => {
        const result = getResult(idx);
        const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
        if (!result || !isDev) return null;

        const isResExpanded = expandedResults[idx];

        return (
            <div className="mt-2 ml-1">
                <button
                    onClick={(e) => toggleResult(e, idx)}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-brand/5 hover:bg-brand/10 text-[9px] font-black text-brand/60 uppercase transition-colors cursor-pointer"
                >
                    {isResExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                    <span>Resultado Raw</span>
                </button>
                {isResExpanded && (
                    <div className="mt-2 p-3 bg-main/40 border border-line/20 rounded-xl overflow-x-auto">
                        <pre className="text-[10px] font-mono text-content-muted leading-tight">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            onClick={() => filteredSteps.length > 1 && setIsExpanded(!isExpanded)}
            className={`flex flex-col py-2 px-1 w-full max-w-[95%] animate-fade-in group/steps transition-all duration-300 ${filteredSteps.length > 1 ? 'cursor-pointer hover:bg-brand/1 rounded-lg' : ''}`}
        >
            <div className="border-l-2 border-brand/5 pl-4 ml-0.5 transition-all duration-500">
                {/* Previous steps — collapsible */}
                <div className={`grid transition-all duration-500 ease-in-out ${isExpanded && filteredSteps.length > 1 ? 'grid-rows-[1fr] opacity-100 mb-4' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
                    <div className="overflow-hidden space-y-3.5 pt-1">
                        {previousSteps.map((step, idx) => {
                            const desc = getToolDescription(step);
                            if (!desc) return null;
                            return (
                                <div key={idx} className="flex flex-col gap-1 w-full animate-fade-in">
                                    <div className="flex items-start gap-2.5 text-[11px] text-content-muted/40 font-medium">
                                        <div className="mt-1">
                                            <StepIcon step={step} completed={isCompleted(idx)} />
                                        </div>
                                        <div className="flex flex-col gap-0.5 w-full">
                                            <span>{desc}</span>
                                        </div>
                                    </div>
                                    <ResultDisplay idx={idx} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Active (Last) Step - Always visible */}
                <div className="flex flex-col gap-1 w-full animate-fade-in">
                    <div className="flex items-start gap-2.5 text-[11px] text-content font-bold transition-all duration-300">
                        <div className="mt-1">
                            <ActiveStepIcon step={lastStep} done={isCompleted(lastIdx)} />
                        </div>
                        <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center gap-2 flex-wrap min-h-[1.8em]">
                                <span className="italic">{getToolDescription(lastStep)}</span>
                                {!isExpanded && filteredSteps.length > 1 && (
                                    <span className="opacity-0 group-hover/steps:opacity-100 transition-all duration-300 text-[8px] font-black text-brand/50 uppercase tracking-widest translate-x-1 group-hover/steps:translate-x-0">
                                        ( + {filteredSteps.length - 1} pasos )
                                    </span>
                                )}
                            </div>
                            {lastStep.type === 'tool_call' && lastStep.args && Object.keys(lastStep.args).length > 0 && (
                                <div className="flex gap-1.5 flex-wrap mt-1">
                                    {Object.entries(lastStep.args).map(([k, v]) => (
                                        <span key={k} className="px-1 py-0.5 rounded bg-brand/5 text-[8px] font-black text-brand/40 uppercase">
                                            {k}: {String(v)}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <ResultDisplay idx={lastIdx} />
                </div>
            </div>
        </div>
    );
};


const AgentChat = forwardRef<any, AgentChatProps>(({
    messages,
    setMessages,
    origins,
    destinations,
    departureDate,
    returnDate,
    setOrigins,
    setDestinations,
    setDepartureDate,
    setReturnDate
}, ref) => {
    const { isAuthenticated, user, isLoading } = useAuth()
    const { location } = useUserLocation();


    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const { data: availableModelsData, isLoading: isLoadingModels } = useModels();
    const availableModels = availableModelsData || [];
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [isStreaming, setIsStreaming] = useState(false);
    const { mutateAsync: connectStream } = useAgentStreamMutation();

    useEffect(() => {
        if (availableModels.length > 0 && !selectedModel) {
            const first = availableModels[0];
            if (typeof first === 'string') {
                setSelectedModel(first);
            }
        }
    }, [availableModels, selectedModel]);

    const stopStream = (reason?: 'user' | 'error') => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsStreaming(false);
        setIsTyping(false);

        setMessages((prev: ExtendedChatMessage[]) => {
            const hasStreaming = prev.some(m => m.isStreaming);

            if (hasStreaming) {
                return prev.map(m => {
                    if (m.isStreaming) {
                        let newContent = m.content;
                        if (reason === 'user') newContent += "\n\n *— Generación interrumpida por el usuario*";
                        if (reason === 'error') newContent += "\n\n *— Error en la generación, por favor, intenta de nuevo*";
                        return { ...m, isStreaming: false, content: newContent };
                    }
                    return m;
                });
            } else if (reason) {
                // Si estábamos "pensando" (reasoning) o esperando el primer token
                const text = reason === 'user' ? "Generación interrumpida por el usuario" : "Error en la generación";
                return [
                    ...prev,
                    { role: 'assistant', content: `*— ${text}*` } as ExtendedChatMessage
                ];
            }
            return prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m);
        });
    };



    const clearChat = () => {
        stopStream();
        setMessages([]);
        toast.info("Historial de aventura borrado");
    };

    useImperativeHandle(ref, () => ({
        stopStream,
        clearChat
    }));


    const streamResponse = async (newMessages: AsyncAPIModels.AssistantRequestMessage[]) => {
        setIsStreaming(true);
        let iterationCount = 0;
        let hasFinalResult = false;
        let capturedError = false;

        const ctrl = new AbortController();
        abortControllerRef.current = ctrl;

        try {
            await connectStream({
                body: {
                    messages: newMessages,
                    model: selectedModel,
                    location: location ? location : undefined,
                    manual_state: {
                        origins: origins?.map(o => o.iata_code),
                        destinations: destinations?.map(d => d.iata_code),
                        departure_date: departureDate,
                        return_date: returnDate
                    }
                },
                signal: ctrl.signal,
                onEvent: (event) => {
                    if (event.type === 'iteration') {
                        iterationCount = event.count;
                    }

                    if (event.type === 'step') {
                        setIsTyping(false);
                        setMessages((prev: ExtendedChatMessage[]) => {
                            const last = prev[prev.length - 1];
                            if (last && last.role === 'assistant' && last.isStreaming) {
                                return [
                                    ...prev.slice(0, -1),
                                    { ...last, content: (last.content || '') + event.message, isStreaming: true }
                                ];
                            } else {
                                const cleaned = prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m);
                                return [
                                    ...cleaned,
                                    { role: 'assistant', content: event.message, isStreaming: true } as ExtendedChatMessage
                                ];
                            }
                        });
                    } else if (event.type === 'tool_call' || event.type === 'tool_result' || event.type === 'tool_progress' || event.type === 'iteration') {
                        // Sync UI state for searches
                        if (event.type === 'tool_call') {
                            if (event.name === 'getUserInfo') {
                                window.dispatchEvent(new CustomEvent('app:agent-get-user-info'));
                            } else if (event.name === 'getUserSearchHistory') {
                                window.dispatchEvent(new CustomEvent('app:agent-get-user-search-history'));
                            }

                            if (event.name === 'performSearch') {
                                const args = event.args || {};
                                if (args.origins && args.origins.length > 0 && setOrigins) {
                                    Promise.all(args.origins.map((iata: string) => getAirportByIata(iata)))
                                        .then(res => {
                                            const valid = res.filter(Boolean) as AirportResponse[];
                                            if (valid.length > 0) setOrigins(valid);
                                        }).catch(console.error);
                                }
                                if (args.destinations && args.destinations.length > 0 && setDestinations) {
                                    Promise.all(args.destinations.map((iata: string) => getAirportByIata(iata)))
                                        .then(res => {
                                            const valid = res.filter(Boolean) as AirportResponse[];
                                            if (valid.length > 0) setDestinations(valid);
                                        }).catch(console.error);
                                }
                                if (args.departure_date && setDepartureDate) setDepartureDate(args.departure_date);
                                if (args.return_date && setReturnDate) setReturnDate(args.return_date);
                            }
                        }

                        setMessages((prev: ExtendedChatMessage[]) => {
                            const cleaned = prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m);

                            if (event.type === 'tool_result' || event.type === 'tool_progress') {
                                let found = false;
                                const newMessages = cleaned.map(m => {
                                    if (!found && m.role === 'reasoning' && m.steps) {
                                        const steps = [...m.steps];
                                        const callIdx = steps.findLastIndex((s) => s.type === 'tool_call' && s.call_id === event.call_id);
                                        if (callIdx !== -1) {
                                            if (event.type === 'tool_result') {
                                                steps[callIdx] = { ...steps[callIdx], result: event.result, status: 'completed' } as UIStep;
                                            } else {
                                                steps[callIdx] = { ...steps[callIdx], progress: event.event } as UIStep;
                                            }
                                            found = true;
                                            return { ...m, steps };
                                        }
                                    }
                                    return m;
                                });
                                if (found) return newMessages;
                            }

                            return [...cleaned, { role: 'reasoning', content: '', steps: [event] }];
                        });
                    } else if (event.type === 'final_result') {
                        hasFinalResult = true;
                        
                        if (event.data?.flights && event.data.flights.length > 0) {
                            window.dispatchEvent(new CustomEvent('ai_flights_returned'));
                        }

                        setMessages((prev: ExtendedChatMessage[]) => {
                            const cleaned = prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m);
                            if (event.data?.flights && event.data.flights.length > 0) {
                                const lastAssistantIdx = cleaned.findLastIndex(m => m.role === 'assistant');
                                if (lastAssistantIdx !== -1) {
                                    const newMessages = [...cleaned];
                                    newMessages[lastAssistantIdx] = {
                                        ...newMessages[lastAssistantIdx],
                                        flights: event.data.flights
                                    } as ExtendedChatMessage;
                                    return newMessages;
                                }
                            }
                            return cleaned;
                        });
                        setIsTyping(false);
                    } else if (event.type === 'error') {
                        toast.error(event.message);
                        console.error(event.message);
                    }
                },
                onError: (err) => {
                    capturedError = true;
                    stopStream('error');
                    console.error("Stream Error:", err);
                    toast.error("Error al conectar con el servidor");
                }
            });
        } finally {
            setIsStreaming(false);
            if (abortControllerRef.current === ctrl) {
                abortControllerRef.current = null;
            }
        }
    };



    // Auto-scroll logic: uses a larger threshold and instant scroll during streaming for better reliability
    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer) return;

        const scrollToBottom = (instant = false) => {
            scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: instant ? 'auto' : 'smooth'
            });
        };

        const observer = new MutationObserver(() => {
            const threshold = 150;
            const distanceBuffer = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
            if (distanceBuffer < threshold) {
                scrollToBottom(isStreaming);
            }
        });

        observer.observe(scrollContainer, {
            childList: true,
            subtree: true,
            characterData: true
        });

        scrollToBottom(isStreaming);
        return () => observer.disconnect();
    }, [messages.length, isStreaming]);

    const handleSend = (text: string = input) => {
        const trimmed = text.trim();
        if (!trimmed || isStreaming) return;

        const userMsg: AsyncAPIModels.AssistantRequestMessage = { role: "user", content: trimmed };
        const updatedMessages: ExtendedChatMessage[] = [
            ...messages.map(m => m.isLimitReached ? { ...m, isLimitReached: false } : m),
            userMsg
        ];
        setMessages(updatedMessages);
        setInput("");

        // Limpieza de mensajes para el backend (evitar REQUEST_VALIDATION_ERROR por propiedades extra)
        const cleanMessages = updatedMessages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({
                role: m.role,
                content: m.content
            }));

        streamResponse(cleanMessages as AsyncAPIModels.AssistantRequestMessage[]);
        setIsTyping(true);
    };



    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthName = nextMonth.toLocaleString('es-ES', { month: 'long' });

    const suggestions = [
        `¿A dónde puedo ir en ${nextMonthName}?`,
        "Sugiéreme un viaje basado en mis gustos",
        "¿Cual es mi historial de busquedas?"
    ];

    if (isLoading) return null;

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col h-full w-full bg-linear-to-b from-main/60 to-surface/40 dark:from-surface/60 dark:to-main/40 rounded-2xl border border-line/20 overflow-hidden backdrop-blur-sm transition-all duration-500 items-center justify-center p-8 text-center animate-fade-in">
                <div className="w-20 h-20 shrink-0 rounded-3xl bg-brand/5 border border-brand/10 flex items-center justify-center text-brand mb-6 shadow-xs relative">
                    <Lock size={40} className="animate-pulse" />
                    <div className="absolute inset-0 bg-brand/10 blur-xl rounded-full scale-110 opacity-50" />
                </div>
                <h2 className="text-xl font-black mb-2 text-content italic">Inteligencia Exclusiva</h2>
                <div className="text-sm text-content-muted max-w-72 leading-relaxed mb-10 font-medium">
                    <ReactMarkdown>Nuestro asistente **flAIghts** utiliza IA para aprender de tus gustos y sugerirte destinos únicos.</ReactMarkdown>
                    <br />
                    Para interactuar con él y ver recomendaciones, necesitas estar identificado.
                </div>

                <div className="flex flex-col gap-3 w-full max-w-64">
                    <Link
                        to="/login"
                        className="px-6 py-4 bg-brand text-white font-black rounded-2xl shadow-[0_8px_20px_rgba(var(--brand-rgb),0.3)] hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3 group text-sm"
                    >
                        Iniciar Sesión
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                        to="/register"
                        className="px-6 py-3 text-brand font-bold text-xs hover:bg-brand/5 rounded-xl transition-all"
                    >
                        ¿No tienes cuenta? Únete aquí
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-linear-to-b from-main/60 to-surface/40 dark:from-surface/60 dark:to-main/40 rounded-2xl border border-line/20 overflow-hidden backdrop-blur-sm transition-all duration-500">
            {/* Mobile-only Header */}
            <div className="lg:hidden px-4 py-2 border-b border-line/10 bg-surface/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-brand animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-content-muted">Agente flAIghts</span>
                </div>
                <div className="flex items-center gap-3">
                    {availableModels.length > 0 && (
                        <div className="relative group/model">
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="appearance-none bg-main/50 border border-line/30 pl-2.5 pr-7 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest text-content-muted focus:outline-none transition-all cursor-pointer max-w-[120px] truncate"
                            >
                                {availableModels.map(model => (
                                    <option key={model} value={model} className="bg-surface text-content text-xs">
                                        {(model as string).toUpperCase()}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-content-muted/50">
                                <ChevronDown size={10} />
                            </div>
                        </div>
                    )}
                    {availableModels.length === 0 && (
                        <div className="flex items-center gap-1">
                            <div className="w-1 h-1 bg-orange-400 rounded-full animate-pulse" />
                            <span className="text-[8px] font-bold uppercase text-content-muted/40 tracking-widest italic">
                                {isLoadingModels ? "Conectando..." : "Sin Servicio"}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-line scrollbar-track-transparent"
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                        <div className="w-20 h-20 shrink-0 rounded-3xl bg-brand/5 border border-brand/10 flex items-center justify-center text-brand mb-6 shadow-xs relative">
                            <Sparkles size={40} className="animate-pulse" />
                            <div className="absolute inset-0 bg-brand/10 blur-xl rounded-full scale-110 opacity-50" />
                        </div>
                        <h2 className="text-xl font-black mb-2 text-content italic">¡Hola, {isAuthenticated ? user?.username : 'explorador'}!</h2>
                        <div className="text-sm text-content-muted max-w-64 leading-relaxed mb-8 font-medium prose-strong:text-brand">
                            <ReactMarkdown>Soy fl**AI**ghts. No solo busco vuelos, aprendo de ti para sugerirte tu próximo destino.</ReactMarkdown>
                        </div>

                        {availableModels.length > 0 && (
                            <div className="grid grid-cols-1 gap-2 w-full max-w-72">
                                {suggestions.map((s, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(s)}
                                        className="px-4 py-3 text-xs font-bold text-content-muted hover:text-brand bg-white/5 hover:bg-brand/10 border border-line/30 hover:border-brand/40 rounded-2xl transition-all text-left flex items-center gap-3 group active:scale-95 cursor-pointer"
                                    >
                                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        // No renderizar el contenedor si es reasoning y no tiene steps visibles
                        if (msg.role === 'reasoning') {
                            const visibleSteps = msg.steps?.filter((s) => s.type !== 'iteration');
                            if (!visibleSteps || visibleSteps.length === 0) return null;
                        }

                        return (
                            <div
                                key={i}
                                className={`flex flex-col gap-4 ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full animate-fade-in py-1`}
                            >
                                <div className="flex flex-col gap-1 w-full">
                                    {msg.role === 'user' && (
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-brand pr-1 text-right">
                                            Tú
                                        </span>
                                    )}

                                    {msg.role === 'reasoning' ? (
                                        <StepProgress steps={msg.steps || []} />
                                    ) : (msg.role as string) === 'tool' ? (
                                        <div className="flex flex-col gap-2 p-5 bg-brand/3 border-l-4 border-brand/40 rounded-r-2xl w-full max-w-110 mb-4 shadow-xs overflow-hidden backdrop-blur-xs">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 rounded-xl bg-brand/10 text-brand">
                                                    {getToolIcon((msg as any).toolName)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black uppercase text-brand/70 tracking-widest leading-tight">Ejecutando</span>
                                                    <span className="text-xs font-bold text-content italic leading-snug">
                                                        {getToolDescription({ type: 'tool_call', name: (msg as any).toolName, args: (msg as any).args, call_id: '' } as UIStep)}
                                                    </span>
                                                </div>
                                                {(msg as any).status === 'working' && (
                                                    <div className="ml-auto flex gap-1.5 items-center px-2 py-1 rounded-full bg-brand/10">
                                                        <div className="w-1 h-1 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                                        <div className="w-1 h-1 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                        <div className="w-1 h-1 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`text-sm leading-relaxed w-fit max-w-[85%] transition-all duration-300
                                        ${msg.role === 'user'
                                                ? 'ml-auto font-bold text-white bg-brand px-4 py-2 rounded-2xl rounded-tr-none shadow-[0_4px_12px_rgba(var(--brand-rgb),0.25)]'
                                                : 'text-left font-medium text-content pl-1'}`}
                                        >
                                            {msg.role === 'assistant' && i === messages.length - 1 && isTyping && !(msg as any).isStreaming ? (
                                                <Typewriter
                                                    text={msg.content}
                                                    onComplete={() => setIsTyping(false)}
                                                />
                                            ) : (
                                                <div className={`prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-2 prose-li:my-1 
                                                prose-strong:text-brand prose-strong:font-black prose-headings:text-content prose-code:text-brand 
                                                prose-code:bg-brand/10 prose-code:px-1 prose-code:rounded
                                                ${msg.role === 'user' ? 'prose-p:text-white!' : ''}
                                                ${msg.isStreaming ? 'streaming-cursor' : ''}`}
                                                >
                                                    {msg.content?.trim() ? (
                                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                    ) : msg.isStreaming ? (
                                                        <p>&nbsp;</p>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Flights results associated with the message */}
                                    {(msg as any).flights && (msg as any).flights.length > 0 && (
                                        <div className="w-full flex flex-col gap-4 mt-4 animate-fade-in-up">
                                            {(msg as any).flights.map((f: SearchResponseData) => (
                                                <FlightCard key={f._id} search={f} />
                                            ))}
                                        </div>
                                    )}

                                    {/* Iteration limit reached continue button */}
                                    {(msg as any).isLimitReached && availableModels.length > 0 && (
                                        <div className="mt-4 flex animate-fade-in">
                                            <button
                                                onClick={() => handleSend("continue")}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-brand/10 hover:bg-brand/20 border border-brand/20 rounded-xl text-xs font-black text-brand uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm group"
                                            >
                                                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                                <span>Seguir analizando</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}



                {(isTyping || isStreaming) && (
                    !messages.length ||
                    messages[messages.length - 1]?.role === 'user' ||
                    messages[messages.length - 1]?.role === ('reasoning' as any) ||
                    (messages[messages.length - 1]?.role === 'assistant' && !(messages[messages.length - 1] as any).content?.trim() && (messages[messages.length - 1] as any).isStreaming)
                ) && (
                        <div className="flex items-center gap-3 py-2 pl-1 animate-fade-in">
                            <div className="flex gap-1.5">
                                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-xs font-bold text-brand uppercase tracking-widest animate-pulse">Pensando...</span>
                        </div>
                    )}
            </div>

            {/* Input Area */}
            <div className="p-2 lg:p-4 border-t border-line/20 bg-white/5 backdrop-blur-md shrink-0">
                {availableModels.length === 0 ? (
                    <div className="relative w-full flex items-center justify-center gap-3 bg-orange-500/5 border border-orange-500/20 rounded-2xl py-3 px-4 shadow-sm animate-fade-in group overflow-hidden">
                        <AlertCircle size={18} className="text-orange-500 animate-pulse relative z-10" />
                        <span className="text-xs font-bold text-orange-500/80 uppercase tracking-widest italic relative z-10">
                            {isLoadingModels ? "Sincronizando modelos..." : "Agente no disponible temporalmente"}
                        </span>
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-orange-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>
                ) : (
                    <div className="relative w-full flex items-center gap-2 bg-main/50 border border-line/50 rounded-2xl pl-4 pr-1.5 py-1.5 focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/10 transition-all shadow-inner group">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Pregunta lo que quieras..."
                            className="flex-1 bg-transparent py-2 text-sm focus:outline-none placeholder:text-content-muted/40 placeholder:italic font-medium min-w-0"
                        />

                    <div className="flex items-center gap-1.5 shrink-0">
                        {isStreaming ? (
                            <button
                                onClick={() => stopStream('user')}
                                className="p-2 rounded-xl transition-all duration-300 bg-red-500 hover:bg-red-600 text-white shadow-lg scale-100 hover:scale-105 active:scale-95 cursor-pointer"
                                title="Detener"
                            >
                                <Square size={16} className="fill-white" />
                            </button>
                        ) : (
                            <>
                                {/* Compact Model Selector Dropdown - Hidden on mobile, shown on desktop */}
                                {availableModels.length > 0 && (
                                    <div className="hidden lg:block relative group/model">
                                        <select
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="appearance-none bg-surface/80 hover:bg-white/10 border border-line/30 hover:border-brand/40 pl-2.5 pr-7 py-2 rounded-xl text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-content-muted hover:text-brand focus:outline-none transition-all cursor-pointer max-w-[120px] truncate"
                                        >
                                            {availableModels.map(model => (
                                                <option key={model} value={model} className="bg-surface text-content text-xs">
                                                    {(model as string).toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-content-muted/50">
                                            <ChevronDown size={10} />
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim()}
                                    className={`p-2 rounded-xl transition-all duration-300 cursor-pointer
                                        ${input.trim()
                                            ? 'bg-brand text-content-on-brand shadow-lg scale-100 ring-2 ring-brand/10'
                                            : 'bg-line/20 text-content-muted scale-95 opacity-50'}`}
                                >
                                    <Send size={16} className={input.trim() ? 'animate-pulse' : ''} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
                )}
                <div className="mt-2.5 flex items-center justify-center">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-content-muted/30 text-center">
                        IA Experimental • flAIghts puede cometer errores. Verifica la información importante.
                    </span>
                </div>
            </div>
        </div>
    );
});

export default AgentChat;
