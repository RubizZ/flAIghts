import React, { Component, ErrorInfo, ReactNode } from "react";
import { TriangleAlert, RefreshCcw, Home, ChevronDown, ChevronUp, Copy, LogIn } from "lucide-react";
import { AuthFailError } from "@/api/axios-instance";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
    initialError?: Error | null;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    showDetails: boolean;
    isAuthError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: !!props.initialError,
            error: props.initialError || null,
            errorInfo: null,
            showDetails: false,
            isAuthError: props.initialError instanceof AuthFailError,
        };
    }

    public static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
            showDetails: false,
            isAuthError: error instanceof AuthFailError,
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    private handleReset = () => {
        if (this.props.onReset) {
            this.props.onReset();
            this.setState({ hasError: false, error: null, errorInfo: null, isAuthError: false });
        } else {
            this.setState({ hasError: false, error: null, errorInfo: null, isAuthError: false });
            window.location.reload();
        }
    };

    private redirectToLogin = () => {
        window.location.href = '/login';
    };

    private toggleDetails = () => {
        this.setState(prevState => ({ showDetails: !prevState.showDetails }));
    };

    private copyErrorToClipboard = () => {
        const { error, errorInfo } = this.state;
        const text = `Error: ${error?.message}\n\nStack:\n${errorInfo?.componentStack}`;
        navigator.clipboard.writeText(text);
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Si es un error de autenticación, mostrar UI específica
            if (this.state.isAuthError) {
                return (
                    <div className="w-full min-h-screen flex items-center justify-center p-6 bg-main relative overflow-hidden group">
                        {/* Background decoration */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-amber-500/50 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-brand/5 blur-[100px] rounded-full" />
                        <div className="absolute -top-20 -left-20 w-64 h-64 bg-brand/5 blur-[100px] rounded-full" />

                        <div className="max-w-xl w-full text-center space-y-8 relative z-10 transition-all duration-500">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-amber-500/10 blur-2xl rounded-full scale-150 animate-pulse" />
                                <div className="relative bg-surface p-6 rounded-full border border-amber-500/20 shadow-2xl">
                                    <LogIn size={48} className="text-amber-500" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-2xl font-bold text-content tracking-tight">Sesión expirada</h2>
                                <p className="text-content-muted leading-relaxed">
                                    Tu sesión ha expirado o no tienes permisos para acceder a este recurso. Por favor, inicia sesión de nuevo.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                <button
                                    onClick={this.redirectToLogin}
                                    className="flex items-center gap-2 px-6 py-3 bg-brand text-content-on-brand rounded-full font-semibold hover:bg-brand/90 transition-all duration-300 shadow-md active:scale-95 group/btn cursor-pointer"
                                >
                                    <LogIn size={18} />
                                    Iniciar sesión
                                </button>

                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="flex items-center gap-2 px-6 py-3 bg-surface text-content rounded-full border border-line hover:bg-surface/80 transition-all duration-300 active:scale-95 cursor-pointer"
                                >
                                    <Home size={18} />
                                    Volver al inicio
                                </button>
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <div className="w-full min-h-screen flex items-center justify-center p-6 bg-main relative overflow-hidden group">
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-red-500/50 to-transparent shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-brand/5 blur-[100px] rounded-full" />
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-brand/5 blur-[100px] rounded-full" />

                    <div className="max-w-xl w-full text-center space-y-8 relative z-10 transition-all duration-500">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-red-500/10 blur-2xl rounded-full scale-150 animate-pulse" />
                            <div className="relative bg-surface p-6 rounded-full border border-red-500/20 shadow-2xl">
                                <TriangleAlert size={48} className="text-red-500" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-2xl font-bold text-content tracking-tight">Vuelo interrumpido</h2>
                            <p className="text-content-muted leading-relaxed">
                                Parece que hemos encontrado una turbulencia inesperada en el sistema. No hemos podido completar tu solicitud.
                            </p>
                        </div>

                        {/* Error detail (Expandable) */}
                        {this.state.error && (
                            <div className="w-full text-left">
                                <button
                                    onClick={this.toggleDetails}
                                    className="flex items-center gap-2 text-xs font-mono text-content-muted hover:text-content transition-colors mx-auto mb-2 cursor-pointer"
                                >
                                    {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    {this.state.showDetails ? "Ocultar detalles técnicos" : "Ver detalles técnicos"}
                                </button>

                                {this.state.showDetails && (
                                    <div className="bg-surface/50 border border-red-500/10 rounded-xl p-4 overflow-hidden relative group/code animate-in fade-in slide-in-from-top-2 duration-200">
                                        <button
                                            onClick={this.copyErrorToClipboard}
                                            className="absolute top-2 right-2 p-2 bg-main/50 rounded-md hover:bg-main text-content-muted hover:text-content transition-all opacity-0 group-hover/code:opacity-100"
                                            title="Copiar error"
                                        >
                                            <Copy size={14} />
                                        </button>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                            <p className="text-sm font-bold text-red-400 mb-2">
                                                {this.state.error.toString()}
                                            </p>
                                            <pre className="text-[10px] font-mono text-content-muted whitespace-pre-wrap wrap-break-word">
                                                {this.state.errorInfo?.componentStack}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <button
                                onClick={this.handleReset}
                                className="flex items-center gap-2 px-6 py-3 bg-brand text-content-on-brand rounded-full font-semibold hover:bg-brand/90 transition-all duration-300 shadow-md active:scale-95 group/btn cursor-pointer"
                            >
                                <RefreshCcw size={18} className="group-hover/btn:rotate-180 transition-transform duration-500" />
                                Recargar la pagina
                            </button>

                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex items-center gap-2 px-6 py-3 bg-surface text-content rounded-full border border-line hover:bg-surface/80 transition-all duration-300 active:scale-95 cursor-pointer"
                            >
                                <Home size={18} />
                                Volver al inicio
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
