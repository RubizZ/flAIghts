import React, { useState } from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import { useListEvaluations } from '@/api/generated/openapi/admin';

export default function EvaluationsTab() {
    const { data: evaluations, isLoading } = useListEvaluations();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-content">
                Resultados de Evaluación <span className="ml-2 text-xs font-normal text-content-muted bg-surface px-2 py-1 rounded-lg border border-line">Total: {evaluations?.length ?? '...'}</span>
            </h2>

            {isLoading ? (
                <div className="p-20 text-center animate-pulse flex flex-col items-center justify-center gap-4 bg-surface/50 rounded-3xl border border-line border-dashed">
                    <Loader2 className="w-8 h-8 animate-spin text-brand" />
                    <p className="text-content-muted font-medium">Cargando evaluaciones...</p>
                </div>
            ) : (
                <div className="bg-surface rounded-2xl border border-line overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-surface-variant text-content-muted">
                            <tr>
                                <th className="px-4 py-3 font-bold">Fecha</th>
                                <th className="px-4 py-3 font-bold">Usuario</th>
                                <th className="px-4 py-3 font-bold">Misiones</th>
                                <th className="px-4 py-3 font-bold">Rating Medio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {evaluations?.map((ev: any) => {
                                const avgRating = ev.results.reduce((acc: number, r: any) => acc + r.answer.rating, 0) / ev.results.length;
                                return (
                                    <React.Fragment key={ev._id}>
                                        <tr className="hover:bg-brand/5 transition-colors group/row cursor-pointer" onClick={() => setExpandedId(expandedId === ev._id ? null : ev._id)}>
                                            <td className="px-4 py-3 text-xs">{new Date(ev.timestamp).toLocaleString()}</td>
                                            <td className="px-4 py-3 font-medium">{ev.userId?.username || ev.fullName || 'Anónimo'}</td>
                                            <td className="px-4 py-3">{ev.results.length} misiones</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold text-brand">{avgRating.toFixed(1)}</span>
                                                    <div className="w-16 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                                                        <div className="h-full bg-brand" style={{ width: `${(avgRating / 5) * 100}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex p-1.5 group-hover/row:bg-brand/10 group-hover/row:text-brand rounded-lg transition-all">
                                                    <ChevronRight size={16} className={`transition-transform ${expandedId === ev._id ? 'rotate-90 text-brand' : ''}`} />
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedId === ev._id && (
                                            <tr>
                                                <td colSpan={5} className="p-4 bg-surface-variant/20 border-t border-line">
                                                    <div className="grid gap-3">
                                                        {ev.results.map((res: any, i: number) => (
                                                            <div key={i} className="bg-surface p-4 rounded-2xl border border-line shadow-sm">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <p className="font-bold text-content text-xs uppercase tracking-tight">Misión: <span className="text-brand">{res.missionId}</span></p>
                                                                    <span className="bg-brand/10 text-brand px-2 py-1 rounded-lg text-xs font-black">Score: {res.answer.rating}/5</span>
                                                                </div>
                                                                <p className="text-sm text-content-muted italic">"{res.answer.comment || 'Sin comentarios'}"</p>
                                                                <p className="text-[10px] text-content-muted mt-2 opacity-50">Completada en {new Date(res.completedAt).toLocaleTimeString()}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
