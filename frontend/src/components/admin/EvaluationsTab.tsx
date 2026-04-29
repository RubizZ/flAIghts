import React, { useState } from 'react';
import { Loader2, ChevronRight, Trophy, TrendingUp, Activity, Users, Star, BarChart3 } from 'lucide-react';
import { useListEvaluations } from '@/api/generated/openapi/admin';

export default function EvaluationsTab() {
    const { data: response, isLoading } = useListEvaluations();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const evaluations = response?.evaluations || [];
    const summary = response?.summary;

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-content tracking-tight">
                    Evaluaciones del Sistema
                </h2>
                <p className="text-sm text-content-muted">Resultados del estudio de usabilidad y métricas SUS</p>
            </div>

            {/* Summary Cards */}
            {!isLoading && summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-surface border border-line rounded-[2rem] p-6 flex flex-col gap-3 hover:shadow-xl transition-all group">
                        <div className="flex justify-between items-center">
                            <div className="p-3 bg-brand/10 text-brand rounded-2xl group-hover:scale-110 transition-transform">
                                <Trophy size={20} />
                            </div>
                            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">Score SUS</span>
                        </div>
                        <div>
                            <p className="text-3xl font-black text-content tracking-tighter">{summary.averageSusScore}</p>
                            <p className="text-[10px] font-bold text-content-muted uppercase tracking-wider">Promedio Global</p>
                        </div>
                    </div>

                    <div className="bg-surface border border-line rounded-[2rem] p-6 flex flex-col gap-3 hover:shadow-xl transition-all group">
                        <div className="flex justify-between items-center">
                            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
                                <Users size={20} />
                            </div>
                            <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">N={summary.totalEvaluations}</span>
                        </div>
                        <div>
                            <p className="text-3xl font-black text-content tracking-tighter">{summary.totalEvaluations}</p>
                            <p className="text-[10px] font-bold text-content-muted uppercase tracking-wider">Total Evaluaciones</p>
                        </div>
                    </div>

                    <div className="bg-surface border border-line rounded-[2rem] p-6 flex flex-col gap-3 hover:shadow-xl transition-all group">
                        <div className="flex justify-between items-center">
                            <div className="p-3 bg-violet-500/10 text-violet-500 rounded-2xl group-hover:scale-110 transition-transform">
                                <TrendingUp size={20} />
                            </div>
                            <div className="flex gap-1">
                                <span className="text-[8px] font-bold text-content-muted bg-surface-variant px-1.5 py-0.5 rounded uppercase">Min: {summary.minSusScore}</span>
                                <span className="text-[8px] font-bold text-content-muted bg-surface-variant px-1.5 py-0.5 rounded uppercase">Max: {summary.maxSusScore}</span>
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <p className="text-3xl font-black text-content tracking-tighter">{(summary.averageSusScore >= 68 ? 'A' : 'B')}</p>
                            <p className="text-xs font-bold text-emerald-500 mb-1.5">Grado de Usabilidad</p>
                        </div>
                    </div>

                    <div className="bg-surface border border-line rounded-[2rem] p-6 flex flex-col gap-3 hover:shadow-xl transition-all group overflow-hidden relative">
                        <div className="flex justify-between items-center mb-1">
                            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl group-hover:scale-110 transition-transform">
                                <BarChart3 size={20} />
                            </div>
                            <span className="text-xs font-bold text-content-muted">Distribución</span>
                        </div>
                        <div className="space-y-1.5 relative z-10">
                            {[
                                { label: 'Excelente', val: summary.distribution.excellent, color: 'bg-emerald-500' },
                                { label: 'Bueno', val: summary.distribution.good, color: 'bg-blue-500' },
                                { label: 'Aceptable', val: summary.distribution.ok, color: 'bg-amber-500' },
                                { label: 'Pobre', val: summary.distribution.poor, color: 'bg-red-500' },
                            ].map(d => (
                                <div key={d.label} className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${d.color}`} />
                                    <span className="text-[9px] font-bold text-content-muted flex-1 uppercase tracking-tighter">{d.label}</span>
                                    <span className="text-[9px] font-black text-content">{d.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="p-20 text-center animate-pulse flex flex-col items-center justify-center gap-4 bg-surface/50 rounded-3xl border border-line border-dashed">
                    <Loader2 className="w-8 h-8 animate-spin text-brand" />
                    <p className="text-content-muted font-medium">Cargando evaluaciones...</p>
                </div>
            ) : (
                <div className="bg-surface rounded-2xl border border-line overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-surface-variant/50 text-content-muted border-b border-line">
                            <tr>
                                <th className="px-4 py-3 font-bold">Fecha</th>
                                <th className="px-4 py-3 font-bold">Usuario</th>
                                <th className="px-4 py-3 font-bold">Misiones</th>
                                <th className="px-4 py-3 font-bold text-center">Score SUS</th>
                                <th className="px-4 py-3 font-bold text-center">Rating Medio</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {evaluations.map((ev: any) => {
                                const avgRating = ev.results.reduce((acc: number, r: any) => acc + r.answer.rating, 0) / ev.results.length;
                                return (
                                    <React.Fragment key={ev._id}>
                                        <tr className="hover:bg-brand/5 transition-colors group/row cursor-pointer" onClick={() => setExpandedId(expandedId === ev._id ? null : ev._id)}>
                                            <td className="px-4 py-3 text-xs">{new Date(ev.timestamp).toLocaleString()}</td>
                                            <td className="px-4 py-3 font-medium">{ev.userId?.username || ev.fullName || 'Anónimo'}</td>
                                            <td className="px-4 py-3">{ev.results.length} misiones</td>
                                            <td className="px-4 py-3 text-center">
                                                {ev.susScore !== undefined ? (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand font-black text-xs">
                                                        <Activity size={12} />
                                                        {ev.susScore.toFixed(1)}
                                                    </div>
                                                ) : (
                                                    <span className="text-content-muted opacity-30">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <span className="font-bold text-brand text-xs">{avgRating.toFixed(1)}</span>
                                                    <div className="w-12 h-1.5 bg-surface-variant rounded-full overflow-hidden">
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
                                                <td colSpan={6} className="p-4 bg-surface-variant/20 border-t border-line">
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
