import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Loader2, Sliders, Plane, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useListAirports, useUpdateAirport } from '@/api/generated/openapi/admin';
import { useTranslation } from 'react-i18next';
import Select from '@/components/ui/Select';

export default function AirportsTab() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sort, setSort] = useState<{ field: string, order: 'asc' | 'desc' }>({ field: 'importance_score', order: 'desc' });
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
        limit: 15,
        sortBy: sort.field,
        sortOrder: sort.order
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

    const SortHeader = ({ label, field, className = "" }: { label: string, field: string, className?: string }) => (
        <th
            className={`px-4 py-3 font-bold cursor-pointer hover:text-brand transition-colors group ${className}`}
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
                                    <SortHeader label="IATA" field="iata_code" className="w-24" />
                                    <SortHeader label="Nombre" field="name" />
                                    <SortHeader label="Tipo" field="type" />
                                    <th className="px-4 py-3 font-bold">Ubicación</th>
                                    <SortHeader label="Importancia" field="importance_score" className="text-center justify-center" />
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
                                                <span className="font-bold text-content/80">{a.city}, {t(`countries.${a.country}`, { defaultValue: a.country })}</span>
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
                                <Select
                                    value={editingAirport.type}
                                    onChange={(val) => setEditingAirport({ ...editingAirport, type: val })}
                                    options={[
                                        { value: 'large_airport', label: 'Large Airport' },
                                        { value: 'medium_airport', label: 'Medium Airport' },
                                        { value: 'small_airport', label: 'Small Airport' },
                                        { value: 'closed', label: 'Closed / Inactive' }
                                    ]}
                                    icon={Plane}
                                />
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
