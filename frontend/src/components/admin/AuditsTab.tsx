import { Filter, ChevronRight, Loader2, Activity, User, Shield, Search, Bot } from 'lucide-react';
import { useListAudits } from '@/api/generated/openapi/admin';
import Select from '@/components/ui/Select';
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/axios-instance';

const RESOURCE_MAP: Record<string, { label: string, icon: any }> = {
    USER: { label: 'Usuarios', icon: User },
    AUTH: { label: 'Autenticación', icon: Shield },
    SEARCH: { label: 'Búsquedas', icon: Search },
    AGENT: { label: 'Asistente IA', icon: Bot },
    BOOKING: { label: 'Reservas', icon: Activity }
};

export default function AuditsTab() {
    const [page, setPage] = useState(1);
    const [selectedResource, setSelectedResource] = useState<string>('all');
    const [selectedAction, setSelectedAction] = useState<string>('all');

    // Obtener metadatos dinámicos del backend
    const { data: metadata, isLoading: isLoadingMetadata } = useQuery({
        queryKey: ['admin', 'audits', 'metadata'],
        queryFn: () => customInstance<{ resources: string[], actionsByResource: Record<string, string[]> }>({
            url: '/admin/audits/metadata',
            method: 'GET'
        })
    });

    // Reiniciar acción al cambiar de recurso
    useEffect(() => {
        setSelectedAction('all');
        setPage(1);
    }, [selectedResource]);

    const { data, isLoading } = useListAudits({
        page,
        limit: 20,
        // @ts-ignore
        resource: selectedResource === 'all' ? undefined : selectedResource,
        // @ts-ignore
        action: selectedAction === 'all' ? undefined : selectedAction
    });

    const audits = data?.audits || [];
    const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

    const resourceOptions = useMemo(() => {
        const base = [{ value: 'all', label: 'Todos los recursos', icon: Filter }];
        if (!metadata?.resources) return base;

        return [
            ...base,
            ...metadata.resources.map(res => ({
                value: res,
                label: RESOURCE_MAP[res]?.label || res,
                icon: RESOURCE_MAP[res]?.icon || Activity
            }))
        ];
    }, [metadata]);

    const actionOptions = useMemo(() => {
        const base = [{ value: 'all', label: selectedResource === 'all' ? 'Filtrar por acción...' : 'Todas las acciones' }];
        if (selectedResource === 'all' || !metadata?.actionsByResource?.[selectedResource]) return base;

        return [
            ...base,
            ...metadata.actionsByResource[selectedResource].map(action => ({
                value: action,
                label: action.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' '),
                icon: Activity
            }))
        ];
    }, [selectedResource, metadata]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-content">Logs de Auditoría</h2>
                    <span className="ml-2 text-xs font-normal text-content-muted bg-surface px-2 py-1 rounded-lg border border-line">Total: {data?.total ?? '...'}</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    {/* Selector de recursos */}
                    <Select
                        value={selectedResource}
                        onChange={(val) => setSelectedResource(val)}
                        options={resourceOptions}
                        className="w-full sm:w-56"
                        align="right"
                        disabled={isLoadingMetadata}
                    />

                    {/* Selector de acciones dependiente */}
                    <Select
                        value={selectedAction}
                        onChange={(val) => setSelectedAction(val)}
                        options={actionOptions}
                        className="w-full sm:w-64"
                        align="right"
                        disabled={selectedResource === 'all' || isLoadingMetadata}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="p-20 text-center animate-pulse flex flex-col items-center justify-center gap-4 bg-surface/50 rounded-3xl border border-line border-dashed">
                    <Loader2 className="w-8 h-8 animate-spin text-brand" />
                    <p className="text-content-muted font-medium">Buscando registros...</p>
                </div>
            ) : (
                <>
                    <div className="bg-surface rounded-2xl border border-line overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-surface-variant text-content-muted">
                                <tr>
                                    <th className="px-4 py-3 font-bold">Fecha</th>
                                    <th className="px-4 py-3 font-bold">Acción</th>
                                    <th className="px-4 py-3 font-bold">Usuario</th>
                                    <th className="px-4 py-3 font-bold">IP</th>
                                    <th className="px-4 py-3 font-bold"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {audits.map((log: any) => (
                                    <React.Fragment key={log._id}>
                                        <tr
                                            className="hover:bg-brand/5 transition-colors group cursor-pointer"
                                            onClick={() => setExpandedAudit(expandedAudit === log._id ? null : log._id)}
                                        >
                                            <td className="px-4 py-3 opacity-60">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-content">{log.action}</span>
                                                    <span className="text-[10px] uppercase text-content-muted">{log.resource}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium">{log.user.username || log.user.id || 'No autenticado'}</td>
                                            <td className="px-4 py-3 opacity-50 font-mono">{log.user.ip}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex p-1.5 group-hover:bg-brand/10 group-hover:text-brand rounded-lg transition-all">
                                                    <ChevronRight size={14} className={expandedAudit === log._id ? 'rotate-90' : ''} />
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedAudit === log._id && (
                                            <tr className="bg-surface-variant/20">
                                                <td colSpan={5} className="p-4">
                                                    <div className="bg-black/5 dark:bg-black/20 p-4 rounded-xl border border-line overflow-x-auto">
                                                        <pre className="text-[10px] font-mono leading-tight">{JSON.stringify(log.details, null, 2)}</pre>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Controles de paginación para Auditoría */}
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 bg-surface border border-line rounded-xl text-xs font-bold disabled:opacity-30 hover:bg-surface-variant transition-colors cursor-pointer">
                            Anterior
                        </button>
                        <span className="text-xs self-center font-mono bg-surface border border-line px-3 py-2 rounded-xl">Página {page} de {data?.totalPages || 1}</span>
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
