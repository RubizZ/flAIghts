import React, { useState } from 'react';
import {
    ShieldCheck,
    Users,
    FileWarning,
    History,
    BarChart3,
    ClipboardCheck,
    ChevronRight,
    Plane
} from 'lucide-react';
import { useGetStats } from '@/api/generated/openapi/admin';

// Importación de componentes de pestañas extraídos
import StatsView from '@/components/admin/StatsView';
import UsersTab from '@/components/admin/UsersTab';
import AirportsTab from '@/components/admin/AirportsTab';
import ReportsTab from '@/components/admin/ReportsTab';
import EvaluationsTab from '@/components/admin/EvaluationsTab';
import AuditsTab from '@/components/admin/AuditsTab';

type TabType = 'stats' | 'users' | 'airports' | 'reports' | 'evaluations' | 'audits';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<TabType>('stats');

    // Hook para estadísticas generales (se pasa a StatsView)
    const { data: stats, isLoading: isLoadingStats } = useGetStats({
        query: { enabled: activeTab === 'stats' }
    });

    const tabs = [
        { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
        { id: 'users', label: 'Usuarios', icon: Users },
        { id: 'airports', label: 'Aeropuertos', icon: Plane },
        { id: 'reports', label: 'Reportes', icon: FileWarning },
        { id: 'evaluations', label: 'Evaluaciones', icon: ClipboardCheck },
        { id: 'audits', label: 'Auditoría', icon: History },
    ];

    return (
        <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-content">Panel de Control</h1>
                        <p className="text-content-muted">Gestión global del sistema flAIghts</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 overflow-hidden">
                    {/* Sidebar / Navigation */}
                    <div className="lg:col-span-3 space-y-2 overflow-y-auto custom-scrollbar pr-2">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm hover:scale-[1.02] active:scale-95 cursor-pointer ${activeTab === tab.id
                                        ? 'bg-brand text-content-on-brand shadow-lg shadow-brand/20'
                                        : 'text-content-muted hover:bg-surface hover:text-content hover:translate-x-1'
                                        }`}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                    {activeTab === tab.id && <ChevronRight size={14} className="ml-auto" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="lg:col-span-9 bg-surface/30 border border-line rounded-3xl p-6 min-h-[600px]">
                        {activeTab === 'stats' && <StatsView stats={stats} loading={isLoadingStats} onTabChange={setActiveTab} />}
                        {activeTab === 'users' && <UsersTab />}
                        {activeTab === 'airports' && <AirportsTab />}
                        {activeTab === 'reports' && <ReportsTab />}
                        {activeTab === 'evaluations' && <EvaluationsTab />}
                        {activeTab === 'audits' && <AuditsTab />}
                    </div>
                </div>
            </div>
        </div>
    );
}