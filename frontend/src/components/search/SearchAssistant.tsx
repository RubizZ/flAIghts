import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Trash2, Search } from "lucide-react";
import { useSearchAssistant } from "@/api/generated/search/search";
import { toast } from "sonner";
import type {
    AssistantRequestMessage as ChatMessage,
    AssistantExtractedData as SearchFlightData,
    AssistantResponse
} from "@/api/generated/model";

interface ExtendedChatMessage extends ChatMessage {
    detectedData?: SearchFlightData;
}

interface SearchAssistantProps {
    messages: ExtendedChatMessage[];
    setMessages: (messages: ExtendedChatMessage[]) => void;
    onDetectedData: (data: SearchFlightData) => void;
    onReadyChange: (ready: boolean) => void;
    onSearch: () => void;
    isReady: boolean;
    location?: { latitude: number; longitude: number };
}

const Typewriter = ({ text, speed = 20 }: { text: string; speed?: number }) => {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        setDisplayedText("");
        let i = 0;
        const timer = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(timer);
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed]);

    return <>{displayedText}</>;
};

export default function SearchAssistant({ messages, setMessages, onDetectedData, onReadyChange, onSearch, isReady, location }: SearchAssistantProps) {
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const { mutate: sendMessage, isPending } = useSearchAssistant();

    // Auto-scroll logic using MutationObserver to handle typewriter growth and dynamic cards
    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer) return;

        // Function to perform the scroll
        const scrollToBottom = () => {
            scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
            });
        };

        // Observe changes in children and text content (typewriter)
        const observer = new MutationObserver(scrollToBottom);
        observer.observe(scrollContainer, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // Initial scroll
        scrollToBottom();

        return () => observer.disconnect();
    }, [isReady]); // Re-bind if ready state changes, though MutationObserver covers most cases

    const handleSend = () => {
        if (!input.trim() || isPending) return;

        const userMsg: ChatMessage = { role: "user", content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");

        // Filter out system messages and other roles not allowed in ChatRequestMessage
        const messagesForApi = newMessages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

        sendMessage({ data: { messages: messagesForApi, location } }, {
            onSuccess: (res: AssistantResponse) => {
                const message = res.message;
                const flightData = res.data;

                if (message) {
                    const assistantMsg: ExtendedChatMessage = {
                        role: message.role,
                        content: message.content,
                        detectedData: flightData
                    };
                    setMessages([...newMessages, assistantMsg]);
                }

                if (flightData && typeof flightData === 'object' && !('role' in flightData)) {
                    onDetectedData(flightData);
                }

                if (res.ready !== undefined) {
                    onReadyChange(res.ready);
                }
            },
            onError: (error) => {
                console.error("Assistant Error:", error);
                const errorMsg = error.message;
                toast.error(errorMsg);
            }
        });
    };

    const clearChat = () => {
        setMessages([]);
        toast.info("Historial limpiado");
    };

    return (
        <div className="flex flex-col h-112.5 w-full bg-main/40 dark:bg-surface/40 rounded-3xl border border-line/50 overflow-hidden backdrop-blur-sm shadow-inner transition-all duration-500">
            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-line scrollbar-track-transparent"
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fade-in">
                        <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-4">
                            <Bot size={32} className="animate-pulse" />
                        </div>
                        <h2 className="text-sm font-bold mb-1 italic">Asistente flAIghts</h2>
                        <p className="text-[11px] text-content-muted max-w-50">
                            Dime a dónde quieres ir y cuándo, ¡y yo preparo la búsqueda por ti!
                        </p>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start animate-slide-in-up animate-duration-300'}`}
                        >
                            <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse w-full' : 'flex-row'}`}>
                                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border shadow-xs
                                    ${msg.role === 'user'
                                        ? 'bg-brand text-content-on-brand border-brand/20'
                                        : 'bg-surface text-brand border-line'}`}
                                >
                                    {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
                                </div>
                                <div className={`max-w-[85%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed shadow-xs
                                        ${msg.role === 'user'
                                            ? 'bg-brand text-content-on-brand rounded-tr-none'
                                            : 'bg-surface/80 text-content border border-line/50 rounded-tl-none'}`}
                                    >
                                        {msg.role === 'assistant' && i === messages.length - 1 ? (
                                            <Typewriter text={msg.content} />
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Detected Data Card */}
                            {msg.detectedData && (msg.detectedData.origin || msg.detectedData.destination || msg.detectedData.departure_date || msg.detectedData.return_date) && (
                                <div className="ml-11 mr-4 p-2 bg-main/50 border border-line/30 rounded-xl flex flex-wrap gap-2 animate-fade-in">
                                    {msg.detectedData.origin && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-surface rounded-lg border border-line/40 text-[10px]">
                                            <span className="text-content-muted">Orig:</span>
                                            <span className="font-bold text-brand">{msg.detectedData.origin.iata_code}</span>
                                        </div>
                                    )}
                                    {msg.detectedData.destination && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-surface rounded-lg border border-line/40 text-[10px]">
                                            <span className="text-content-muted">Dest:</span>
                                            <span className="font-bold text-brand">{msg.detectedData.destination.iata_code}</span>
                                        </div>
                                    )}
                                    {msg.detectedData.departure_date && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-surface rounded-lg border border-line/40 text-[10px]">
                                            <span className="text-content-muted">Salida:</span>
                                            <span className="font-bold text-brand">{msg.detectedData.departure_date}</span>
                                        </div>
                                    )}
                                    {msg.detectedData.return_date && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-surface rounded-lg border border-line/40 text-[10px]">
                                            <span className="text-content-muted">Regreso:</span>
                                            <span className="font-bold text-brand">{msg.detectedData.return_date}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}

                {isPending && (
                    <div className="flex gap-3 animate-fade-in">
                        <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border border-line bg-surface text-brand shadow-xs">
                            <Bot size={16} className="animate-pulse" />
                        </div>
                        <div className="px-4 py-3 bg-surface/80 border border-line/50 rounded-xl rounded-tl-none">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-brand/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-brand/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-brand/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                {isReady && !isPending && (
                    <div className="flex flex-col gap-3 py-2 animate-slide-in-up">
                        <div className="bg-brand/5 border border-brand/20 p-4 rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                                <Bot size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-content">¿Todo listo para buscar?</p>
                                <p className="text-[10px] text-content-muted">He preparado todos los detalles de tu viaje.</p>
                            </div>
                        </div>
                        <button
                            onClick={onSearch}
                            className="group relative flex items-center justify-center gap-3 bg-brand text-content-on-brand py-4 rounded-2xl font-bold text-base shadow-[0_15px_40px_rgba(var(--brand-rgb),0.25)] active:scale-95 transition-all overflow-hidden cursor-pointer"
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            <Search size={20} className="group-hover:scale-110 transition-transform" />
                            <span>Confirmar y Buscar Vuelos</span>
                        </button>
                        <button
                            onClick={() => onReadyChange(false)}
                            className="text-[10px] text-center text-content-muted hover:text-brand transition-colors font-medium py-1"
                        >
                            Seguir hablando o cambiar algo
                        </button>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-line/30 bg-surface/20 shrink-0">
                <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                        <button
                            onClick={clearChat}
                            className="p-3 text-content-muted hover:text-red-500 transition-colors rounded-xl bg-main/50 border border-line/50"
                            title="Limpiar chat"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ej: De Madrid a Tokyo el 20 de mayo"
                            className="w-full bg-main border border-line/50 rounded-xl pl-3 pr-10 py-3 text-xs focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/5 transition-all shadow-inner"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isPending}
                            className={`absolute right-1.5 top-1.5 p-1.5 rounded-lg transition-all
                                ${input.trim() && !isPending
                                    ? 'bg-brand text-content-on-brand shadow-sm scale-100'
                                    : 'bg-line/50 text-content-muted scale-95 opacity-50'}`}
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
