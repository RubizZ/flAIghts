import { SearchResponseData } from "@/api/generated/openapi/model";
import { Link } from "react-router-dom";
import { 
    Calendar, 
    MapPin, 
    ChevronRight, 
    Clock, 
    TrendingUp, 
    CheckCircle2, 
    AlertCircle, 
    Loader2,
    Star,
    RefreshCw,
    ArrowRight,
    Trophy,
    Plane
} from "lucide-react";

interface SearchCardProps {
    search: SearchResponseData;
    isFeatured?: boolean;
    children?: React.ReactNode; // For actions like share button
}

export default function SearchCard({ search, isFeatured, children }: SearchCardProps) {
    const bestItinerary = search.departure_itineraries?.[0];
    
    const statusConfig = {
        searching: { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: "Buscando", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
        completed: { icon: <CheckCircle2 className="w-3 h-3" />, label: "Completada", color: "bg-green-500/10 text-green-500 border-green-500/20" },
        failed: { icon: <AlertCircle className="w-3 h-3" />, label: "Fallida", color: "bg-red-500/10 text-red-500 border-red-500/20" },
    };

    const status = statusConfig[search.status] || statusConfig.searching;

    // Calcular duración total si hay itinerario
    const duration = Math.round(bestItinerary?.total_duration ?? 0);
    const durationHours = Math.floor(duration / 60);
    const durationMinutes = duration % 60;

    return (
        <div className="relative group">
            <Link
                to={`/search/${search._id}`}
                className="block p-5 sm:p-6 bg-surface border border-line rounded-[2rem] hover:border-brand hover:shadow-xl hover:shadow-brand/5 transition-all duration-300 group/card relative overflow-hidden"
            >
                {/* Gradient Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover/card:bg-brand/10 transition-colors duration-500" />
                
                <div className="relative flex flex-col gap-5">
                    {/* Header: Origins -> Destinations */}
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-xl sm:text-2xl font-black text-content tracking-tight">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-content to-content/70">
                                        {search.origins.join(', ')}
                                    </span>
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand/10 text-brand group-hover/card:scale-110 transition-transform duration-500">
                                        <ChevronRight size={18} />
                                    </div>
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand to-brand/70">
                                        {search.destinations.join(', ')}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-content-muted uppercase tracking-widest opacity-60">
                                <MapPin size={12} />
                                <span>{search.source === 'agent' ? 'Búsqueda por IA' : 'Búsqueda Manual'}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${status.color}`}>
                                {status.icon}
                                {status.label}
                            </div>
                            {children}
                        </div>
                    </div>

                    {/* Body: Search Info Grid */}
                    <div className="grid grid-cols-2 gap-4 py-4 border-t border-line/30">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-content-muted/60 uppercase tracking-widest">Fecha Salida</span>
                            <div className="flex items-center gap-2 text-sm font-bold text-content">
                                <Calendar size={14} className="text-brand" />
                                {new Date(search.departure_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-content-muted/60 uppercase tracking-widest">Tipo de Viaje</span>
                            <div className="flex items-center gap-2 text-sm font-bold text-content">
                                {search.return_date ? <RefreshCw size={14} className="text-brand" /> : <ArrowRight size={14} className="text-brand" />}
                                {search.return_date ? 'Ida y Vuelta' : 'Solo Ida'}
                            </div>
                        </div>
                    </div>

                    {/* Featured Result Section */}
                    {bestItinerary && (
                        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-brand/5 to-transparent border border-brand/10 p-4 group/featured">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/featured:opacity-20 transition-opacity">
                                <Trophy size={40} className="text-brand" />
                            </div>
                            
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black text-brand uppercase tracking-widest flex items-center gap-1.5">
                                    <Star size={10} fill="currentColor" />
                                    Mejor opción encontrada
                                </span>
                                <div className="text-2xl font-black text-brand">
                                    {bestItinerary.total_price}€
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-brand/5 pt-3">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-content-muted uppercase tracking-wider opacity-50">Duración</span>
                                        <div className="flex items-center gap-1.5 text-xs font-black text-content">
                                            <Clock size={12} className="text-content-muted" />
                                            {durationHours}h {durationMinutes}m
                                        </div>
                                    </div>
                                    <div className="w-px h-6 bg-brand/10" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-content-muted uppercase tracking-wider opacity-50">Aerolíneas</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {bestItinerary.legs?.slice(0, 2).map((leg, idx) => (
                                                <div key={idx} className="w-5 h-5 bg-white dark:bg-surface border border-line/20 rounded-md p-0.5 shadow-xs" title={leg.airline}>
                                                    {leg.airline_logo ? (
                                                        <img src={leg.airline_logo} alt={leg.airline} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Plane size={10} className="text-content-muted" />
                                                    )}
                                                </div>
                                            ))}
                                            {(bestItinerary.legs?.length ?? 0) > 2 && (
                                                <span className="text-[9px] font-bold text-content-muted">+{(bestItinerary.legs?.length ?? 0) - 2}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2 bg-brand/10 rounded-xl text-brand group-hover/featured:bg-brand group-hover/featured:text-white transition-all duration-300">
                                    <ArrowRight size={14} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer / Meta */}
                    <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold text-content-muted/40 uppercase tracking-widest">
                            {new Date(search.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                        </div>
                        {isFeatured && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-black uppercase tracking-tighter border border-amber-500/20">
                                <Star size={10} fill="currentColor" />
                                Destacada
                            </div>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    );
}
