import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Filter, Loader2, MapPin, Info, X, Check, AlertCircle, ShieldCheck, User, RotateCcw } from 'lucide-react';
import { useListAirportReports, useUpdateReportStatus } from '@/api/generated/openapi/admin';
import Select from '@/components/ui/Select';

/**
 * Premium ReportsTab with dedicated confirmation block.
 * Replaces actions with a clear confirm/cancel state for better UX.
 */
export default function ReportsTab() {
    const queryClient = useQueryClient();
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'resolved' | 'rejected'>('all');
    const [confirmAction, setConfirmAction] = useState<{ id: string, type: 'resolved' | 'rejected' } | null>(null);

    const { data: reports, isLoading } = useListAirportReports({
        status: selectedStatus === 'all' ? undefined : selectedStatus
    });

    const { mutate: updateStatus, isPending: isUpdating } = useUpdateReportStatus({
        mutation: {
            onSuccess: () => {
                toast.success("Operación realizada con éxito");
                queryClient.invalidateQueries({ queryKey: ['/admin/airport-reports'] });
                queryClient.invalidateQueries({ queryKey: ['/admin/stats'] });
                setConfirmAction(null);
            },
            onError: () => {
                toast.error("Error al procesar la solicitud");
                setConfirmAction(null);
            }
        }
    });

    const handleConfirm = (id: string, type: 'resolved' | 'rejected') => {
        updateStatus({ id, data: { status: type } });
    };

    const statusStyles = {
        pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Pendiente', icon: AlertCircle },
        resolved: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Resuelto', icon: ShieldCheck },
        rejected: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Rechazado', icon: X },
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-line pb-5">
                <div>
                    <h2 className="text-xl font-bold text-content tracking-tight">Reportes</h2>
                    <p className="text-[13px] text-content-muted mt-0.5">Gestión de incidencias flAIghts</p>
                </div>

                <Select
                    value={selectedStatus}
                    onChange={(val) => setSelectedStatus(val as any)}
                    options={[
                        { value: 'all', label: 'Todos los estados' },
                        { value: 'pending', label: 'Solo Pendientes' },
                        { value: 'resolved', label: 'Resueltos' },
                        { value: 'rejected', label: 'Rechazados' }
                    ]}
                    icon={Filter}
                    className="w-full sm:w-52"
                    align="right"
                />
            </div>

            {isLoading ? (
                <div className="p-16 text-center animate-pulse flex flex-col items-center justify-center gap-4 bg-surface/30 rounded-[2rem] border border-line border-dashed">
                    <Loader2 className="w-9 h-9 animate-spin text-brand" />
                    <p className="text-content-muted text-[13px] font-bold">Cargando...</p>
                </div>
            ) : (
                <div className="grid gap-3.5">
                    {!reports || reports.length === 0 ? (
                        <div className="py-20 text-center bg-surface/30 rounded-[2rem] border border-dashed border-line flex flex-col items-center gap-4">
                            <div className="p-4 bg-green-500/10 text-green-500 rounded-full">
                                <ShieldCheck size={40} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-content">¡Todo despejado!</h3>
                                <p className="text-content-muted text-xs mt-1">
                                    No hay reportes {selectedStatus !== 'all' ? `con estado "${selectedStatus}"` : 'pendientes'}.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3.5">
                            {reports?.map((report: any, idx: number) => {
                                const status = statusStyles[report.status as keyof typeof statusStyles] || statusStyles.pending;
                                const StatusIcon = status.icon;
                                const isThisConfirming = confirmAction?.id === report._id;

                                return (
                                    <div 
                                        key={report._id} 
                                        style={{ animationDelay: `${idx * 60}ms` }}
                                        className="
                                            group p-4.5 bg-surface border border-line rounded-2xl 
                                            hover:border-brand/30 transition-all duration-300
                                            flex flex-col md:flex-row justify-between gap-4
                                            hover:shadow-md animate-in slide-in-from-right-4
                                        "
                                    >
                                        <div className="flex-1 space-y-3">
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <div className="px-2 py-0.5 bg-brand/10 text-brand border border-brand/20 rounded-lg font-black text-[10px] tracking-tight">
                                                    {report.airport_iata?.iata_code || report.airport_iata}
                                                </div>
                                                <h3 className="font-bold text-content text-[14px] truncate max-w-[200px]">
                                                    {report.airport_iata?.name}
                                                </h3>
                                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.text}`}>
                                                    <StatusIcon size={10} />
                                                    {status.label}
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <p className="text-[13px] font-medium text-content leading-snug">
                                                    {report.reason}
                                                </p>
                                                {report.airport_iata?.location && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-content-muted font-medium">
                                                        <MapPin size={11} className="text-brand" />
                                                        <span>
                                                            {report.airport_iata.city}, {report.airport_iata.country}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4 pt-1">
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted opacity-80">
                                                    <User size={11} className="text-brand" />
                                                    {report.user_id?.username || 'Anónimo'}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted opacity-80">
                                                    <Info size={11} className="text-brand" />
                                                    {new Date(report.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        {report.status === 'pending' && (
                                            <div className="flex md:flex-col justify-end items-center gap-2 shrink-0 md:pl-5 border-t md:border-t-0 md:border-l border-line/50 pt-3 md:pt-0 min-w-[130px]">
                                                {isThisConfirming ? (
                                                    <div className="flex flex-col gap-2 w-full animate-in zoom-in-95 duration-200">
                                                        <button
                                                            disabled={isUpdating}
                                                            onClick={() => handleConfirm(report._id, confirmAction!.type)}
                                                            className={`
                                                                w-full px-4 py-2 rounded-xl text-[12px] font-black
                                                                transition-all flex items-center justify-center gap-2 cursor-pointer
                                                                active:scale-95 disabled:opacity-50 text-white
                                                                ${confirmAction?.type === 'resolved' 
                                                                    ? 'bg-green-600 shadow-lg shadow-green-500/30' 
                                                                    : 'bg-red-600 shadow-lg shadow-red-500/30'}
                                                            `}
                                                        >
                                                            {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                            Confirmar
                                                        </button>
                                                        <button
                                                            disabled={isUpdating}
                                                            onClick={() => setConfirmAction(null)}
                                                            className="
                                                                w-full px-4 py-1.5 text-[11px] font-bold text-content-muted 
                                                                hover:text-brand transition-all cursor-pointer flex items-center 
                                                                justify-center gap-1 hover:bg-surface-variant/50 rounded-lg
                                                            "
                                                        >
                                                            <RotateCcw size={10} /> Cancelar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => setConfirmAction({ id: report._id, type: 'resolved' })}
                                                            className="flex-1 md:w-full px-4 py-2 bg-green-500 text-white rounded-xl text-[12px] font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                                        >
                                                            <Check size={14} /> Resolver
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmAction({ id: report._id, type: 'rejected' })}
                                                            className="flex-1 md:w-full px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-[12px] font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                                        >
                                                            <X size={14} /> Rechazar
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
