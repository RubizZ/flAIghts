import React from 'react';
import { Users, FileWarning, ClipboardCheck, Search, ArrowUpRight, Activity, History } from 'lucide-react';

interface StatsViewProps {
    stats: any;
    loading: boolean;
    onTabChange?: (tabId: any) => void;
}

/**
 * Premium StatsView component for the Admin Dashboard.
 * Features modern dashboard aesthetics, gradients, and micro-animations.
 */
export default function StatsView({ stats, loading, onTabChange }: StatsViewProps) {
    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-surface border border-line rounded-[2rem] animate-pulse" />
            ))}
        </div>
    );

    const cards = [
        { 
            label: 'Usuarios Totales', 
            value: stats?.users || 0, 
            icon: Users, 
            color: 'from-blue-500/20 to-blue-600/5', 
            iconColor: 'text-blue-500',
            glow: 'shadow-blue-500/20',
            trend: 'Usuarios activos',
            tabId: 'users'
        },
        { 
            label: 'Reportes Pendientes', 
            value: stats?.pendingReports || 0, 
            icon: FileWarning, 
            color: 'from-red-500/20 to-red-600/5', 
            iconColor: 'text-red-500',
            glow: 'shadow-red-500/20',
            trend: 'Requieren atención',
            tabId: 'reports'
        },
        { 
            label: 'Evaluaciones', 
            value: stats?.totalEvaluations || 0, 
            icon: ClipboardCheck, 
            color: 'from-green-500/20 to-green-600/5', 
            iconColor: 'text-green-500',
            glow: 'shadow-green-500/20',
            trend: 'Feedback recibido',
            tabId: 'evaluations'
        },
        { 
            label: 'Aeropuertos', 
            value: stats?.airports || 0, 
            icon: Search, 
            color: 'from-brand/20 to-brand/5', 
            iconColor: 'text-brand',
            glow: 'shadow-brand/20',
            trend: 'Base de datos',
            tabId: 'airports'
        },
        { 
            label: 'Registros de Auditoría', 
            value: stats?.audits || 0, 
            icon: History, 
            color: 'from-violet-500/20 to-violet-600/5', 
            iconColor: 'text-violet-500',
            glow: 'shadow-violet-500/20',
            trend: 'Seguridad del sistema',
            tabId: 'audits'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Dashboard Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-content tracking-tight">Panel de Control</h2>
                    <p className="text-sm text-content-muted flex items-center gap-1.5 mt-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Sistema sincronizado en tiempo real
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-surface border border-line px-4 py-2 rounded-2xl shadow-sm">
                    <Activity size={14} className="text-brand animate-pulse" />
                    <span className="text-xs font-bold text-content-muted uppercase tracking-wider">Health: 100%</span>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <div 
                            key={card.label} 
                            style={{ animationDelay: `${idx * 100}ms` }}
                            onClick={() => onTabChange?.(card.tabId)}
                            className={`
                                relative overflow-hidden p-6 bg-surface border border-line rounded-[2rem] 
                                hover:border-brand/40 transition-all duration-500 group cursor-pointer
                                hover:shadow-2xl hover:shadow-brand/5 hover:-translate-y-1 animate-in zoom-in-95
                            `}
                        >
                            {/* Decorative Background Gradient (visible on hover) */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                            
                            <div className="relative z-10 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <div className={`p-3 rounded-2xl bg-surface border border-line shadow-sm ${card.glow} group-hover:scale-110 transition-transform duration-500`}>
                                        <Icon size={22} className={card.iconColor} />
                                    </div>
                                    <div className="p-1.5 rounded-full bg-surface-variant/50 text-content-muted opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                        <ArrowUpRight size={14} />
                                    </div>
                                </div>
                                
                                <div>
                                    <p className="text-3xl font-black text-content tracking-tighter mb-0.5">
                                        {card.value.toLocaleString()}
                                    </p>
                                    <p className="text-xs font-bold text-content-muted uppercase tracking-widest">{card.label}</p>
                                </div>

                                <div className="pt-2 border-t border-line/50">
                                    <p className="text-[10px] font-medium text-content-muted group-hover:text-content transition-colors">
                                        {card.trend}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
