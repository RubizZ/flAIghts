import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    AlertTriangle, 
    ChevronRight, 
    Loader2, 
    User, 
    Globe, 
    Terminal, 
    Monitor,
    Copy,
    CheckCircle2,
    Bug
} from 'lucide-react';
import { getExecutionErrors, ExecutionError } from '@/api/execution-errors';

export default function ExecutionErrorsTab() {
    const [page, setPage] = useState(1);
    const [expandedError, setExpandedError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin', 'execution-errors', page],
        queryFn: () => getExecutionErrors(page, 20),
        refetchInterval: 30000, // Refrescar cada 30 segundos
    });

    const errors = data?.errors || [];

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                        <Bug size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-content">Errores de Ejecución</h2>
                        <p className="text-xs text-content-muted">Reportes automáticos capturados por el ErrorBoundary</p>
                    </div>
                    <span className="ml-2 text-xs font-normal text-content-muted bg-surface px-2 py-1 rounded-lg border border-line">
                        Total: {data?.total ?? '...'}
                    </span>
                </div>
            </div>

            {isLoading ? (
                <div className="p-20 text-center animate-pulse flex flex-col items-center justify-center gap-4 bg-surface/50 rounded-3xl border border-line border-dashed">
                    <Loader2 className="w-8 h-8 animate-spin text-brand" />
                    <p className="text-content-muted font-medium">Cargando reportes de error...</p>
                </div>
            ) : isError ? (
                <div className="p-20 text-center flex flex-col items-center justify-center gap-4 bg-red-500/5 rounded-3xl border border-red-500/20 border-dashed">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                    <p className="text-red-500 font-medium">Error al cargar los reportes de ejecución.</p>
                </div>
            ) : errors.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center justify-center gap-4 bg-surface/50 rounded-3xl border border-line border-dashed">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <p className="text-content-muted font-medium">No se han registrado errores de ejecución. ¡Buen trabajo!</p>
                </div>
            ) : (
                <>
                    <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-surface-variant/50 text-content-muted border-b border-line">
                                <tr>
                                    <th className="px-4 py-3 font-bold">Fecha</th>
                                    <th className="px-4 py-3 font-bold">Error</th>
                                    <th className="px-4 py-3 font-bold">Usuario</th>
                                    <th className="px-4 py-3 font-bold">URL</th>
                                    <th className="px-4 py-3 font-bold"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {errors.map((error: ExecutionError) => (
                                    <React.Fragment key={error._id}>
                                        <tr
                                            className="hover:bg-red-500/[0.02] transition-colors group cursor-pointer"
                                            onClick={() => setExpandedError(expandedError === error._id ? null : error._id)}
                                        >
                                            <td className="px-4 py-3 opacity-60 font-mono whitespace-nowrap">
                                                {new Date(error.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col max-w-xs sm:max-w-md">
                                                    <span className="font-bold text-red-500 truncate">{error.errorName}</span>
                                                    <span className="text-[10px] text-content-muted line-clamp-1">{error.errorMessage}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <User size={12} className="text-content-muted" />
                                                    {error.user?.username || 'Anónimo'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 opacity-50 truncate max-w-[150px]">
                                                <div className="flex items-center gap-1.5">
                                                    <Globe size={12} />
                                                    {new URL(error.url).pathname}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex p-1.5 group-hover:bg-red-500/10 group-hover:text-red-500 rounded-lg transition-all">
                                                    <ChevronRight size={14} className={expandedError === error._id ? 'rotate-90' : ''} />
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedError === error._id && (
                                            <tr className="bg-surface-variant/10">
                                                <td colSpan={5} className="p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                        <div className="p-3 bg-surface border border-line rounded-xl space-y-1">
                                                            <div className="flex items-center gap-2 text-content-muted mb-1">
                                                                <Monitor size={14} />
                                                                <span className="text-[10px] font-bold uppercase tracking-wider">Browser / User Agent</span>
                                                            </div>
                                                            <p className="text-[10px] font-mono leading-tight break-all opacity-70">{error.userAgent}</p>
                                                        </div>
                                                        <div className="p-3 bg-surface border border-line rounded-xl space-y-1">
                                                            <div className="flex items-center gap-2 text-content-muted mb-1">
                                                                <Globe size={14} />
                                                                <span className="text-[10px] font-bold uppercase tracking-wider">Full URL</span>
                                                            </div>
                                                            <p className="text-[10px] font-mono leading-tight break-all text-brand">{error.url}</p>
                                                        </div>
                                                        <div className="p-3 bg-surface border border-line rounded-xl space-y-1">
                                                            <div className="flex items-center gap-2 text-content-muted mb-1">
                                                                <User size={14} />
                                                                <span className="text-[10px] font-bold uppercase tracking-wider">User Details</span>
                                                            </div>
                                                            <p className="text-[10px] font-mono leading-tight">
                                                                ID: {error.user?.id || 'N/A'}<br/>
                                                                User: {error.user?.username || 'Anonymous'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        {error.stack && (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2 text-red-500 font-bold text-[10px] uppercase tracking-wider">
                                                                        <Terminal size={14} />
                                                                        <span>Stack Trace</span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => handleCopy(error.stack!, error._id + 'stack')}
                                                                        className="p-1 hover:bg-surface rounded text-content-muted transition-colors"
                                                                    >
                                                                        {copiedId === error._id + 'stack' ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                                    </button>
                                                                </div>
                                                                <div className="bg-black/5 dark:bg-black/40 p-4 rounded-xl border border-line max-h-60 overflow-y-auto custom-scrollbar">
                                                                    <pre className="text-[10px] font-mono leading-relaxed text-red-400 whitespace-pre-wrap">{error.stack}</pre>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {error.componentStack && (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2 text-brand font-bold text-[10px] uppercase tracking-wider">
                                                                        <Terminal size={14} />
                                                                        <span>Component Stack</span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => handleCopy(error.componentStack!, error._id + 'comp')}
                                                                        className="p-1 hover:bg-surface rounded text-content-muted transition-colors"
                                                                    >
                                                                        {copiedId === error._id + 'comp' ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                                    </button>
                                                                </div>
                                                                <div className="bg-black/5 dark:bg-black/40 p-4 rounded-xl border border-line max-h-40 overflow-y-auto custom-scrollbar">
                                                                    <pre className="text-[10px] font-mono leading-relaxed text-content-muted whitespace-pre-wrap">{error.componentStack}</pre>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Controles de paginación */}
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 bg-surface border border-line rounded-xl text-xs font-bold disabled:opacity-30 hover:bg-surface-variant transition-colors cursor-pointer">
                            Anterior
                        </button>
                        <span className="text-xs self-center font-mono bg-surface border border-line px-3 py-2 rounded-xl">
                            Página {page} de {data?.totalPages || 1}
                        </span>
                        <button
                            disabled={page >= (data?.totalPages || 1)}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 bg-surface border border-line rounded-xl text-xs font-bold disabled:opacity-30 hover:bg-surface-variant transition-colors cursor-pointer">
                            Siguiente
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
