import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck,
    Users,
    FileWarning,
    History,
    BarChart3,
    ClipboardCheck,
    ChevronRight,
    MapPin,
    Search,
    Loader2,
    Check,
    Activity,
    X,
    Filter,
    Info,
    Eye,
    ExternalLink,
    Trash2,
    UserCog,
    Plane,
    Sliders
} from 'lucide-react';
import {
    useGetStats,
    useListUsers,
    useListAudits,
    useListAirportReports,
    useListEvaluations,
    useUpdateReportStatus,
    useUpdateUserRole,
    useDeleteUser,
    useUpdateAirport,
    useListAirports
} from '@/api/generated/openapi/admin';
import { COUNTRY_NAMES } from '@/constants/countries';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import UserAvatar from '@/components/ui/UserAvatar';

type TabType = 'stats' | 'users' | 'airports' | 'reports' | 'evaluations' | 'audits';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<TabType>('stats');

    // Hooks generados automáticamente
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

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar / Navigation */}
                    <div className="lg:col-span-3 space-y-2">
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
                        {activeTab === 'stats' && <StatsView stats={stats} loading={isLoadingStats} />}
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

function StatsView({ stats, loading }: { stats: any, loading: boolean }) {
    if (loading) return <div className="animate-pulse space-y-4">
        <div className="h-32 bg-surface rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-surface rounded-2xl" />
            <div className="h-32 bg-surface rounded-2xl" />
        </div>
    </div>;

    const cards = [
        { label: 'Usuarios Totales', value: stats?.users || 0, icon: Users, color: 'text-blue-500' },
        { label: 'Reportes Pendientes', value: stats?.pendingReports || 0, icon: FileWarning, color: 'text-red-500' },
        { label: 'Evaluaciones', value: stats?.totalEvaluations || 0, icon: ClipboardCheck, color: 'text-green-500' },
        { label: 'Aeropuertos', value: stats?.airports || 0, icon: Search, color: 'text-brand' },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-content">Resumen del Sistema</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="p-6 bg-surface border border-line rounded-2xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-content-muted">{card.label}</p>
                                    <p className="text-3xl font-bold text-content mt-1">{card.value}</p>
                                </div>
                                <div className={`p-2 rounded-lg bg-surface-variant ${card.color}`}>
                                    <Icon size={20} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// --- Componentes de Pestañas utilizando los hooks generados ---

function UsersTab() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedRole, setSelectedRole] = useState<'all' | 'user' | 'admin'>('all');

    const [actionToConfirm, setActionToConfirm] = useState<{
        type: 'delete' | 'role';
        user: any;
    } | null>(null);

    // Debounce de la búsqueda para no saturar la API
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); // Resetear a la primera página al buscar
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm, selectedRole]);

    const { data, isLoading } = useListUsers({
        page,
        limit: 20,
        q: debouncedSearch,
        role: selectedRole === 'all' ? undefined : selectedRole
    });

    const { mutate: updateRole } = useUpdateUserRole({
        mutation: {
            onSuccess: () => {
                toast.success("Rol actualizado con éxito");
                queryClient.invalidateQueries({ queryKey: ['/admin/users'] });
            },
            onError: () => toast.error("Error al cambiar el rol")
        }
    });

    const { mutate: removeUser } = useDeleteUser({
        mutation: {
            onSuccess: () => {
                toast.success("Usuario eliminado");
                queryClient.invalidateQueries({ queryKey: ['/admin/users'] });
                queryClient.invalidateQueries({ queryKey: ['/admin/stats'] });
            },
            onError: () => toast.error("Error al eliminar el usuario")
        }
    });

    const handleConfirmAction = () => {
        if (!actionToConfirm) return;
        const { type, user } = actionToConfirm;
        if (type === 'delete') {
            removeUser({ id: user._id });
        } else {
            updateRole({ id: user._id, data: { role: user.role === 'admin' ? 'user' : 'admin' } });
        }
        setActionToConfirm(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-content">
                    Gestión de Usuarios <span className="ml-2 text-xs font-normal text-content-muted bg-surface px-2 py-1 rounded-lg border border-line">Total: {data?.total ?? '...'}</span>
                </h2>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="relative group w-full sm:w-64">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-brand transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar usuario..."
                            className="w-full bg-surface border border-line rounded-2xl py-2 pl-10 pr-10 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-surface-variant rounded-full text-content-muted cursor-pointer transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="relative group w-full sm:w-auto">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-brand pointer-events-none" />
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as any)}
                            className="w-full sm:w-auto bg-surface border border-line rounded-2xl py-2 pl-9 pr-8 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all shadow-sm cursor-pointer appearance-none font-medium text-content"
                        >
                            <option value="all">Todos los roles</option>
                            <option value="user">Solo Usuarios</option>
                            <option value="admin">Administradores</option>
                        </select>
                        <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none rotate-90" />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="p-20 text-center animate-pulse flex flex-col items-center justify-center gap-4 bg-surface/50 rounded-3xl border border-line border-dashed">
                    <Loader2 className="w-8 h-8 animate-spin text-brand" />
                    <p className="text-content-muted font-medium">Buscando usuarios...</p>
                </div>
            ) : (
                <>
                    <div className="bg-surface rounded-2xl border border-line overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surface-variant text-content-muted">
                                <tr>
                                    <th className="px-4 py-3 font-bold">Usuario</th>
                                    <th className="px-4 py-3 font-bold">Email</th>
                                    <th className="px-4 py-3 font-bold">Rol</th>
                                    <th className="px-4 py-3 font-bold">Última vez</th>
                                    <th className="px-4 py-3 font-bold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {data?.users.map(u => (
                                    <tr key={u._id} className="hover:bg-brand/5 transition-colors group/row">
                                        <td className="px-4 py-3 font-medium">{u.username}</td>
                                        <td className="px-4 py-3 text-content-muted">{u.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-3 py-1 rounded-full text-[12px] font-bold capitalize ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-content-muted text-xs">
                                            {u.last_seen_at ? new Date(u.last_seen_at).toLocaleString() : 'Nunca'}
                                        </td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-1">
                                            <button
                                                onClick={() => navigate(`/user/${u._id}`)}
                                                className="p-2 hover:bg-brand/10 rounded-xl transition-all text-content-muted hover:text-brand cursor-pointer hover:scale-110 active:scale-90"
                                                title="Ver perfil"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => setActionToConfirm({ type: 'role', user: u })}
                                                className="p-2 hover:bg-amber-500/10 rounded-xl transition-all text-content-muted hover:text-amber-500 cursor-pointer hover:scale-110 active:scale-90"
                                                title="Cambiar rol"
                                            >
                                                <UserCog size={16} />
                                            </button>
                                            <button
                                                onClick={() => setActionToConfirm({ type: 'delete', user: u })}
                                                className="p-2 hover:bg-red-500/10 rounded-xl transition-all text-content-muted hover:text-red-500 cursor-pointer hover:scale-110 active:scale-90"
                                                title="Eliminar usuario"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Añadimos controles de paginación para Usuarios */}
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

            {/* Confirmation Modal */}
            {actionToConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-main border border-line rounded-3xl p-8 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className={`p-4 rounded-2xl ${actionToConfirm.type === 'delete' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {actionToConfirm.type === 'delete' ? <Trash2 size={32} /> : <UserCog size={32} />}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-content leading-tight">
                                    {actionToConfirm.type === 'delete' ? '¿Eliminar usuario?' : '¿Cambiar rol?'}
                                </h3>
                                <p className="text-sm text-content-muted mt-3 leading-relaxed">
                                    {actionToConfirm.type === 'delete'
                                        ? `¿Estás seguro de que quieres eliminar permanentemente a "${actionToConfirm.user.username}"? Esta acción borrará sus datos, amigos y búsquedas.`
                                        : `¿Quieres cambiar el rol de "${actionToConfirm.user.username}" a ${actionToConfirm.user.role === 'admin' ? 'Usuario' : 'Administrador'}?`}
                                </p>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setActionToConfirm(null)}
                                    className="flex-1 px-4 py-3 bg-surface border border-line rounded-xl text-sm font-bold text-content hover:bg-surface-variant transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmAction}
                                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${actionToConfirm.type === 'delete' ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20'
                                        }`}
                                >
                                    {actionToConfirm.type === 'delete' ? 'Eliminar' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

function AirportsTab() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [editingAirport, setEditingAirport] = useState<any | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data, isLoading } = useListAirports({
        q: debouncedSearch || undefined,
        page,
        limit: 15
    });

    const { mutate: updateAirport, isPending: isUpdating } = useUpdateAirport({
        mutation: {
            onSuccess: () => {
                toast.success("Aeropuerto actualizado");
                queryClient.invalidateQueries({ queryKey: ['/admin/airports'] });
                setEditingAirport(null);
            },
            onError: () => toast.error("Error al actualizar")
        }
    });

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        updateAirport({
            iata: editingAirport.iata_code,
            data: {
                name: formData.get('name') as string,
                city: formData.get('city') as string,
                importance_score: parseFloat(formData.get('importance') as string),
                type: formData.get('type') as string,
                latitude: parseFloat(formData.get('latitude') as string),
                longitude: parseFloat(formData.get('longitude') as string)
            }
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-content">
                    Gestión de Aeropuertos <span className="ml-2 text-xs font-normal text-content-muted bg-surface px-2 py-1 rounded-lg border border-line">Total: {data?.total ?? '...'}</span>
                </h2>

                <div className="relative group w-full sm:w-80">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-brand" />
                    <input
                        type="text"
                        placeholder="Buscar por IATA, Ciudad o Nombre..."
                        className="w-full bg-surface border border-line rounded-2xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="p-20 text-center animate-pulse flex flex-col items-center justify-center gap-4 bg-surface/50 rounded-3xl border border-line border-dashed">
                    <Loader2 className="w-8 h-8 animate-spin text-brand" />
                    <p className="text-content-muted font-medium">Buscando aeropuertos...</p>
                </div>
            ) : (
                <>
                    <div className="bg-surface rounded-2xl border border-line overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surface-variant text-content-muted">
                                <tr>
                                    <th className="px-4 py-3 font-bold w-20">IATA</th>
                                    <th className="px-4 py-3 font-bold">Nombre</th>
                                    <th className="px-4 py-3 font-bold">Tipo</th>
                                    <th className="px-4 py-3 font-bold">Ubicación</th>
                                    <th className="px-4 py-3 font-bold text-center">Importancia</th>
                                    <th className="px-4 py-3 font-bold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line text-xs">
                                {data?.items.map((a: any) => (
                                    <tr key={a.iata_code} className="hover:bg-brand/5 transition-colors group/row">
                                        <td className="px-4 py-3">
                                            <span className="font-black bg-brand/10 text-brand px-2 py-0.5 rounded">{a.iata_code}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-content">{a.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 opacity-60 capitalize">{a.type.replace('_', ' ')}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col text-content-muted text-xs">
                                                <span className="font-bold text-content/80">{a.city}, {COUNTRY_NAMES[a.country]?.[1] || a.country}</span>
                                                <span className="font-mono text-[12px] opacity-60">
                                                    {a.location.coordinates[1].toFixed(4)}°, {a.location.coordinates[0].toFixed(4)}°
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-mono font-bold text-brand">{a.importance_score.toFixed(1)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setEditingAirport(a)}
                                                className="p-2 hover:bg-brand/10 rounded-xl transition-all text-content-muted hover:text-brand cursor-pointer hover:scale-110 active:scale-90"
                                                title="Editar datos"
                                            >
                                                <Sliders size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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

            {editingAirport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <form onSubmit={handleUpdate} className="bg-main border border-line rounded-[2.5rem] p-10 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 space-y-8">
                        <div>
                            <h3 className="text-2xl font-bold text-content">Editar Aeropuerto</h3>
                            <p className="text-sm text-content-muted">IATA: <span className="font-bold text-brand">{editingAirport.iata_code}</span></p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-content-muted ml-1 uppercase">Nombre del Aeropuerto</label>
                                <input
                                    name="name"
                                    defaultValue={editingAirport.name}
                                    className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-content-muted ml-1 uppercase">Ciudad</label>
                                <input
                                    name="city"
                                    defaultValue={editingAirport.city}
                                    className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-content-muted ml-1 uppercase">Tipo de Infraestructura</label>
                                <select
                                    name="type"
                                    defaultValue={editingAirport.type}
                                    className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 font-medium"
                                    required
                                >
                                    <option value="large_airport">Large Airport</option>
                                    <option value="medium_airport">Medium Airport</option>
                                    <option value="small_airport">Small Airport</option>
                                    <option value="closed">Closed / Inactive</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-content-muted ml-1 uppercase">Latitud</label>
                                    <input
                                        name="latitude"
                                        type="number" step="any"
                                        defaultValue={editingAirport.location.coordinates[1]}
                                        className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 font-mono"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-content-muted ml-1 uppercase">Longitud</label>
                                    <input
                                        name="longitude"
                                        type="number" step="any"
                                        defaultValue={editingAirport.location.coordinates[0]}
                                        className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 font-mono"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-content-muted ml-1 uppercase">Score de Importancia (0-100)</label>
                                <input
                                    name="importance"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    defaultValue={editingAirport.importance_score}
                                    className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 font-mono"
                                    required
                                />
                                <p className="text-[10px] text-content-muted italic leading-tight">Este valor define la prioridad en los algoritmos de búsqueda de rutas optimizadas.</p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setEditingAirport(null)}
                                className="flex-1 px-4 py-3 bg-surface border border-line rounded-2xl text-sm font-bold hover:bg-surface-variant transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="flex-1 px-4 py-3 bg-brand text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-brand/20"
                            >
                                {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function ReportsTab() {
    const queryClient = useQueryClient();
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'resolved' | 'rejected'>('all');

    const { data: reports, isLoading } = useListAirportReports({
        status: selectedStatus === 'all' ? undefined : selectedStatus
    });

    const { mutate: updateStatus } = useUpdateReportStatus({
        mutation: {
            onSuccess: () => {
                toast.success("Estado del reporte actualizado");
                queryClient.invalidateQueries({ queryKey: ['/admin/airport-reports'] });
                queryClient.invalidateQueries({ queryKey: ['/admin/stats'] });
            },
            onError: () => toast.error("Error al actualizar el reporte")
        }
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-content">
                    Reportes de Aeropuertos <span className="ml-2 text-xs font-normal text-content-muted bg-surface px-2 py-1 rounded-lg border border-line">Total: {reports?.length ?? '...'}</span>
                </h2>

                <div className="relative group w-full sm:w-auto">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-brand pointer-events-none" />
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as any)}
                        className="w-full sm:w-auto bg-surface border border-line rounded-2xl py-2 pl-9 pr-10 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all shadow-sm cursor-pointer appearance-none font-medium text-content"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="pending">Solo Pendientes</option>
                        <option value="resolved">Resueltos</option>
                        <option value="rejected">Rechazados</option>
                    </select>
                    <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none rotate-90" />
                </div>
            </div>

            {isLoading ? (
                <div className="p-20 text-center animate-pulse flex flex-col items-center justify-center gap-4 bg-surface/50 rounded-3xl border border-line border-dashed">
                    <Loader2 className="w-8 h-8 animate-spin text-brand" />
                    <p className="text-content-muted font-medium">Filtrando reportes...</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {!reports || reports.length === 0 ? (
                        <div className="py-20 text-center bg-surface/50 rounded-2xl border border-dashed border-line text-content-muted">
                            No hay reportes {selectedStatus !== 'all' ? `con estado "${selectedStatus}"` : 'pendientes'}
                        </div>
                    ) : (
                        reports?.map((report: any) => (
                            <div key={report._id} className="p-5 bg-surface border border-line rounded-2xl flex flex-col sm:flex-row justify-between gap-4 hover:bg-brand/5 transition-colors group/report">
                                <div className="space-y-2">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-brand/10 text-brand rounded font-black text-xs">{report.airport_iata?.iata_code || report.airport_iata}</span>
                                            <h3 className="font-bold text-content">{report.airport_iata?.name}</h3>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${report.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : report.status === 'resolved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {report.status}
                                            </span>
                                        </div>
                                        {report.airport_iata?.location && (
                                            <div className="flex items-center gap-1.5 text-xs text-content-muted font-mono">
                                                <MapPin size={12} className="group-hover/report:text-brand transition-colors" />
                                                <span>
                                                    [{report.airport_iata.location.coordinates[1].toFixed(4)}, {report.airport_iata.location.coordinates[0].toFixed(4)}] • {report.airport_iata.city}, {report.airport_iata.country}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-content">{report.reason}</p>
                                    <div className="flex items-center gap-2 text-xs text-content-muted">
                                        <Info size={12} />
                                        Reportado por {report.user_id?.username || 'Anónimo'} • {new Date(report.created_at).toLocaleString()}
                                    </div>
                                </div>
                                {report.status === 'pending' && (
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        <button
                                            onClick={() => updateStatus({ id: report._id, data: { status: 'rejected' } })}
                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer" title="Rechazar">
                                            <X size={20} />
                                        </button>
                                        <button
                                            onClick={() => updateStatus({ id: report._id, data: { status: 'resolved' } })}
                                            className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-colors flex items-center gap-2 cursor-pointer">
                                            <Check size={16} /> Resolver
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

function EvaluationsTab() {
    const { data: evaluations, isLoading } = useListEvaluations();

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
                                    <tr key={ev._id} className="hover:bg-brand/5 transition-colors group/row">
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
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const RESOURCE_ACTIONS: Record<string, string[]> = {
    USER: ['INITIATE_REGISTRATION', 'COMPLETE_REGISTRATION', 'UPDATE', 'UPDATE_PROFILE_PICTURE', 'DELETE', 'INITIATE_EMAIL_CHANGE', 'COMPLETE_EMAIL_CHANGE', 'CANCEL_EMAIL_CHANGE', 'SEND_FRIEND_REQUEST', 'CANCEL_FRIEND_REQUEST', 'ACCEPT_FRIEND_REQUEST', 'REJECT_FRIEND_REQUEST', 'REMOVE_FRIEND'],
    AUTH: ['LOGIN', 'FAILED_LOGIN', 'LOGOUT_ALL', 'FAILED_LOGOUT_ALL', 'CHANGE_PASSWORD', 'FAILED_CHANGE_PASSWORD', 'FORGOT_PASSWORD_REQUEST', 'FAILED_FORGOT_PASSWORD', 'RESET_PASSWORD', 'FAILED_RESET_PASSWORD'],
    SEARCH: ['CREATE', 'COMPLETE', 'FAIL', 'SHARE', 'PRIVATIZE'],
    AGENT: ['CHAT', 'TOOL_CALL']
};

function AuditsTab() {
    const [page, setPage] = useState(1);
    const [selectedResource, setSelectedResource] = useState<string>('all');
    const [selectedAction, setSelectedAction] = useState<string>('all');

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

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-content">Logs de Auditoría</h2>
                    <span className="ml-2 text-xs font-normal text-content-muted bg-surface px-2 py-1 rounded-lg border border-line">Total: {data?.total ?? '...'}</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    {/* Selector de recursos */}
                    <div className="relative group w-full sm:w-auto">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-brand pointer-events-none" />
                        <select
                            value={selectedResource}
                            onChange={(e) => setSelectedResource(e.target.value)}
                            className="w-full sm:w-auto bg-surface border border-line rounded-2xl py-2 pl-9 pr-10 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all shadow-sm cursor-pointer appearance-none font-medium text-content"
                        >
                            <option value="all">Todos los recursos</option>
                            <option value="USER">Usuarios</option>
                            <option value="AUTH">Autenticación</option>
                            <option value="SEARCH">Búsquedas</option>
                            <option value="AGENT">Asistente IA</option>
                        </select>
                        <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none rotate-90" />
                    </div>

                    {/* Selector de acciones dependiente */}
                    <div className="relative group w-full sm:w-64">
                        <Activity size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-brand pointer-events-none" />
                        <select
                            value={selectedAction}
                            onChange={(e) => setSelectedAction(e.target.value)}
                            disabled={selectedResource === 'all'}
                            className="w-full bg-surface border border-line rounded-2xl py-2 pl-9 pr-10 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all shadow-sm cursor-pointer appearance-none font-medium text-content disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <option value="all">
                                {selectedResource === 'all' ? 'Filtrar por acción...' : 'Todas las acciones'}
                            </option>
                            {selectedResource !== 'all' && RESOURCE_ACTIONS[selectedResource]?.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                        <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none rotate-90" />
                    </div>
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
                                        <tr className="hover:bg-brand/5 transition-colors group">
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
                                                <button
                                                    onClick={() => setExpandedAudit(expandedAudit === log._id ? null : log._id)}
                                                    className="p-1.5 hover:bg-brand/10 hover:text-brand rounded-lg transition-all cursor-pointer">
                                                    <ChevronRight size={14} className={expandedAudit === log._id ? 'rotate-90' : ''} />
                                                </button>
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