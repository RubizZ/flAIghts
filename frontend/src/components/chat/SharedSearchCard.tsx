import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Plane, Calendar, Clock, DollarSign, Loader2, Star, ArrowRight } from "lucide-react";
import { useSearchResult } from "@/api/generated/openapi/search";
import { useMemo } from "react";

interface SharedSearchCardProps {
    content: string;
    isSelf: boolean;
}

export default function SharedSearchCard({ content, isSelf }: SharedSearchCardProps) {
    const { t } = useTranslation();
    const parts = content.split(":");
    const searchId = parts[1];

    const { data: search, isLoading, isError } = useSearchResult(searchId!, {
        query: { enabled: !!searchId, retry: false }
    });

    const recommendedFlight = useMemo(() => {
        if (!search || !search.departure_itineraries || search.departure_itineraries.length === 0) return null;
        return search.departure_itineraries[0];
    }, [search]);

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 min-w-[280px] max-w-sm animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="h-3 w-24 bg-surface-on-main/20 rounded-full" />
                    <div className="h-4 w-12 bg-brand/20 rounded-full" />
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-20 bg-surface-on-main/20 rounded-lg" />
                        <div className="h-4 w-4 bg-brand/20 rounded-full" />
                        <div className="h-6 w-20 bg-surface-on-main/20 rounded-lg" />
                    </div>
                    <div className="h-3 w-32 bg-surface-on-main/10 rounded-full" />
                </div>
                <div className="h-24 w-full bg-surface-on-main/10 rounded-2xl border border-line/50" />
                <div className="h-10 w-full bg-surface-on-main/20 rounded-2xl" />
            </div>
        );
    }

    if (isError || !search) {
        return (
            <div className="flex flex-col items-center justify-center py-6 px-4 gap-3 min-w-[240px] text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                    <Plane size={24} className="rotate-45 opacity-50" />
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-black uppercase tracking-tight text-content">{t("searchResults.error.notFound")}</span>
                    <p className="text-[10px] font-bold text-content-muted leading-tight">{t("searchResults.error.notFoundDesc")}</p>
                </div>
            </div>
        );
    }

    const origin = search.origins[0];
    const destination = search.destinations[0];
    const departureDate = search.departure_date;
    const returnDate = search.return_date;

    return (
        <div className="flex flex-col gap-4 min-w-[280px] max-w-sm">
            {/* Header: Origin -> Destination */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60">
                    <Plane size={14} className="rotate-45" />
                    {t("share.flightShared")}
                </div>
                {search?.criteria?.priority && (
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter rounded-full border ${isSelf
                            ? 'bg-white/20 text-white border-white/30'
                            : 'bg-brand/10 text-brand border-brand/20'
                        }`}>
                        {search.criteria.priority}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 text-lg font-black leading-tight">
                    <span className="truncate max-w-[120px]">{origin}</span>
                    <ArrowRight size={18} className={`shrink-0 ${isSelf ? 'text-white' : 'text-brand'}`} />
                    <span className="truncate max-w-[120px]">{destination}</span>
                </div>

                <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted">
                        <Calendar size={12} className={isSelf ? 'text-white/70' : 'text-brand/70'} />
                        <span>{new Date(departureDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                        {returnDate && (
                            <>
                                <span className="opacity-40">-</span>
                                <span>{new Date(returnDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Recommended Flight Preview */}
            <div className={`rounded-2xl border p-3 transition-all ${isSelf ? 'bg-white/10 border-white/10' : 'bg-surface/50 border-line'}`}>
                {recommendedFlight ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isSelf ? 'text-white' : 'text-brand'}`}>{t("searchResults.recommended")}</span>
                            <div className="flex items-center gap-1 text-amber-500">
                                <Star size={10} fill="currentColor" />
                                <span className="text-[10px] font-black">{recommendedFlight.score?.toFixed(1)}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {recommendedFlight.legs[0]?.airline_logo && (
                                    <img
                                        src={recommendedFlight.legs[0].airline_logo}
                                        alt={recommendedFlight.legs[0].airline}
                                        className="w-8 h-8 rounded-lg bg-white p-1 shadow-sm border border-line/50 shrink-0 object-contain"
                                    />
                                )}
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs font-black truncate">{recommendedFlight.legs[0]?.airline}</span>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-content-muted">
                                        <Clock size={10} />
                                        <span>{Math.floor(recommendedFlight.total_duration / 60)}h {recommendedFlight.total_duration % 60}m</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className={`flex items-center gap-0.5 text-base font-black ${isSelf ? 'text-white' : 'text-brand'}`}>
                                    <DollarSign size={14} />
                                    <span>{recommendedFlight.total_price.toFixed(0)}</span>
                                </div>
                                <span className="text-[8px] font-black uppercase opacity-40">{t("searchResults.totalPrice")}</span>
                            </div>
                        </div>
                    </div>
                ) : search?.status === 'searching' ? (
                    <div className="flex flex-col items-center justify-center py-4 gap-3">
                        <div className="relative">
                            <Loader2 size={24} className={`animate-spin ${isSelf ? 'text-white' : 'text-brand'}`} />
                            <Plane size={10} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 ${isSelf ? 'text-white' : 'text-brand'}`} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest animate-pulse ${isSelf ? 'text-white' : 'text-brand'}`}>{t("searchResults.searching")}</span>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <span className="text-[10px] font-bold text-content-muted uppercase tracking-widest">{t("searchResults.noResults")}</span>
                    </div>
                )}
            </div>

            <Link
                to={`/search/${searchId}`}
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${isSelf
                        ? 'bg-white text-brand hover:bg-opacity-90 active:scale-95'
                        : 'bg-brand text-content-on-brand hover:opacity-90 active:scale-95'
                    }`}
            >
                {t("share.viewTripDetails")}
                <ArrowRight size={14} />
            </Link>
        </div>
    );
}
