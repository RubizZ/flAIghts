import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Search,
    X,
    Filter,
    ChevronRight,
    Loader2,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Eye,
    UserCog,
    Trash2,
    Check
} from 'lucide-react';
import { useListUsers, useUpdateUserRole, useDeleteUser } from '@/api/generated/openapi/admin';
import { useAuth } from '@/context/AuthContext';
import Select from '@/components/ui/Select';

export default function UsersTab() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuth();

    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedRole, setSelectedRole] = useState<'all' | 'user' | 'admin' | 'superadmin'>('all');
    const [sort, setSort] = useState<{ field: string, order: 'asc' | 'desc' }>({ field: 'created_at', order: 'desc' });
    const [roleSelectorUser, setRoleSelectorUser] = useState<any | null>(null);

    const [actionToConfirm, setActionToConfirm] = useState<{
        type: 'delete' | 'role';
        user: any;
        targetRole?: 'user' | 'admin' | 'superadmin';
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
        role: selectedRole === 'all' ? undefined : selectedRole,
        sortBy: sort.field,
        sortOrder: sort.order
    });

    const { mutate: updateRole } = useUpdateUserRole({
        mutation: {
            onSuccess: () => {
                toast.success("Rol actualizado con éxito");
                queryClient.invalidateQueries({ queryKey: ['/admin/users'] });
            },
            onError: (error: any) => {
                const message = error.response?.data?.message || error.message || "Error al cambiar el rol";
                toast.error(message);
            }
        }
    });

    const { mutate: removeUser } = useDeleteUser({
        mutation: {
            onSuccess: () => {
                toast.success("Usuario eliminado");
                queryClient.invalidateQueries({ queryKey: ['/admin/users'] });
                queryClient.invalidateQueries({ queryKey: ['/admin/stats'] });
            },
            onError: (error: any) => {
                const message = error.response?.data?.message || error.message || "Error al eliminar el usuario";
                toast.error(message);
            }
        }
    });

    const handleConfirmAction = () => {
        if (!actionToConfirm) return;
        const { type, user } = actionToConfirm;
        if (type === 'delete') {
            removeUser({ id: user._id });
        } else {
            updateRole({ id: user._id, data: { role: actionToConfirm.targetRole! } });
        }
        setActionToConfirm(null);
    };

    const SortHeader = ({ label, field }: { label: string, field: string }) => (
        <th
            className="px-4 py-3 font-bold cursor-pointer hover:text-brand transition-colors group"
            onClick={() => setSort(prev => ({ field, order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc' }))}
        >
            <div className="flex items-center gap-1">
                {label}
                <div className="group-hover:animate-pulse transition-all">
                    {sort.field === field ? (
                        sort.order === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />
                    ) : <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50" />}
                </div>
            </div>
        </th>
    );

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

                    <Select
                        value={selectedRole}
                        onChange={(val) => setSelectedRole(val as any)}
                        options={[
                            { value: 'all', label: 'Todos los roles' },
                            { value: 'user', label: 'Solo Usuarios' },
                            { value: 'admin', label: 'Administradores' },
                            { value: 'superadmin', label: 'Super Admins' }
                        ]}
                        icon={Filter}
                        className="w-full sm:w-48"
                        align="right"
                    />
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
                                    <SortHeader label="Usuario" field="username" />
                                    <SortHeader label="Email" field="email" />
                                    <SortHeader label="Rol" field="role" />
                                    <SortHeader label="Última vez" field="last_seen_at" />
                                    <th className="px-4 py-3 font-bold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {data?.users.map(u => (
                                    <tr key={u._id} className="hover:bg-brand/5 transition-colors group/row">
                                        <td className="px-4 py-3 font-medium">{u.username}</td>
                                        <td className="px-4 py-3 text-content-muted">{u.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-3 py-1 rounded-full text-[12px] font-bold capitalize ${u.role === 'superadmin' ? 'bg-violet-600/10 text-violet-600 border border-violet-600/20' :
                                                u.role === 'admin' ? 'bg-amber-500/10 text-amber-500' :
                                                    'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                {u.role === 'superadmin' ? 'super admin' : u.role}
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
                                            {currentUser?.role === 'superadmin' && (
                                                <button
                                                    onClick={() => setRoleSelectorUser(u)}
                                                    className="p-2 hover:bg-amber-500/10 rounded-xl transition-all text-content-muted hover:text-amber-500 cursor-pointer hover:scale-110 active:scale-90"
                                                    title="Cambiar rol"
                                                >
                                                    <UserCog size={16} />
                                                </button>
                                            )}
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

            {/* Role Selection Modal */}
            {roleSelectorUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-main border border-line rounded-[2.5rem] p-10 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col gap-6">
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-content">Seleccionar nuevo rol</h3>
                                <p className="text-sm text-content-muted mt-1">Para <span className="font-bold text-brand">{roleSelectorUser.username}</span></p>
                            </div>

                            <div className="flex flex-col gap-2">
                                {[
                                    { id: 'user', label: 'Usuario', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                                    { id: 'admin', label: 'Administrador', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                                    { id: 'superadmin', label: 'Super Admin', color: 'text-violet-600', bg: 'bg-violet-600/10' }
                                ].map(role => (
                                    <button
                                        key={role.id}
                                        disabled={roleSelectorUser.role === role.id}
                                        onClick={() => {
                                            setActionToConfirm({ type: 'role', user: roleSelectorUser, targetRole: role.id as any });
                                            setRoleSelectorUser(null);
                                        }}
                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.02] active:scale-95
                                            ${roleSelectorUser.role === role.id
                                                ? 'bg-surface opacity-50 cursor-not-allowed border-line'
                                                : 'bg-surface border-line hover:border-brand/40'}`}
                                    >
                                        <span className={`font-bold text-sm ${role.color}`}>{role.label}</span>
                                        {roleSelectorUser.role === role.id && <Check size={16} className="text-content-muted" />}
                                    </button>
                                ))}
                            </div>

                            <button onClick={() => setRoleSelectorUser(null)} className="w-full py-3 bg-surface border border-line rounded-xl text-sm font-bold text-content hover:bg-surface-variant transition-colors cursor-pointer">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
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
                                        : `¿Quieres cambiar el rol de "${actionToConfirm.user.username}" de "${actionToConfirm.user.role === 'superadmin' ? 'Super Admin' : actionToConfirm.user.role}" a "${actionToConfirm.targetRole === 'superadmin' ? 'Super Admin' : actionToConfirm.targetRole}"?`}
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
