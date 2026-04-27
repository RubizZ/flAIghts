import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useGetGlobeAirports } from "@/api/generated/openapi/airports";
import { AlertCircle, Loader2, Star, Plane, ArrowLeft, ArrowRight, DollarSign, Clock, Calendar, Share2, Globe as GlobeIcon, Lock } from "lucide-react";
import { useSearchResult, useShareSearch, usePrivatizeSearch } from "@/api/generated/openapi/search";
import type { ItineraryResponse, GlobeAirportResponse, AirportResponse, FriendUser } from "@/api/generated/openapi/model";
import { useSendMessage } from "@/api/generated/openapi/conversations";
import { useAuth } from "@/context/AuthContext";
import StarsBackground from "@/components/ui/StarsBackground";
import Globe from "@/components/Globe";
import FlightCard from "@/components/search/FlightCard";
import SelectedFlightSummary from "@/components/search/SelectedFlightSummary";
import BookingModal from "@/components/search/BookingModal";
import { usePrepareBooking } from "@/api/generated/openapi/booking";
import { useTranslation } from "react-i18next";
import SmartPopover from "@/components/ui/SmartPopover";
import UserAvatar from "@/components/ui/UserAvatar";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function SearchResults() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const { user, isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [sortBy, setSortBy] = useState<'price' | 'duration' | 'personalized'>('personalized');
    const [hoveredItinerary, setHoveredItinerary] = useState<ItineraryResponse | null>(null);
    const [expandedItinerary, setExpandedItinerary] = useState<ItineraryResponse | null>(null);
    const [selectionStep, setSelectionStep] = useState<'departure' | 'return' | 'summary'>('departure');
    const [selectedDeparture, setSelectedDeparture] = useState<ItineraryResponse | null>(null);
    const [selectedReturn, setSelectedReturn] = useState<ItineraryResponse | null>(null);
    const [isSMScreen, setIsSMScreen] = useState(window.innerWidth >= 640);
    const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
    const [isGlobeReady, setIsGlobeReady] = useState(false);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsSMScreen(window.innerWidth >= 640);
            setIsLargeScreen(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    const { data: airportsData } = useGetGlobeAirports({
        query: { staleTime: Infinity, refetchOnWindowFocus: false }
    });

    // Fetch search results with polling enabled while status is 'searching'
    const { data, isLoading, error } = useSearchResult(
        id!,
        {
            query: {
                enabled: !!id,
                refetchInterval: (query) => {
                    const status = query.state.data?.status;
                    return status === 'searching' ? 1000 : false;
                }
            }
        }
    );

    const { mutate: sendMessage } = useSendMessage({
        mutation: {
            onSuccess: () => {
                toast.success(t("share.flightShared"))
                window.dispatchEvent(new CustomEvent('flaights:mission:send-message'));
                window.dispatchEvent(new CustomEvent('flaights:mission:share-from-results'));
                setIsSharing(false);
            },
            onError: () => toast.error(t("share.shareError"))
        }
    });

    // Hooks de compartir/privatizar
    const { mutateAsync: shareSearch, isPending: isSharingPublic } = useShareSearch({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: [`/search/${id}`] });
                queryClient.invalidateQueries({ queryKey: ['infinite'] });
                queryClient.invalidateQueries({ queryKey: ['/search/user'] });
                toast.success("La búsqueda ahora es pública");
            },
            onError: () => toast.error("Error al compartir la búsqueda")
        }
    });

    const { mutateAsync: privatizeSearch, isPending: isPrivatizingPublic } = usePrivatizeSearch({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: [`/search/${id}`] });
                queryClient.invalidateQueries({ queryKey: ['infinite'] });
                queryClient.invalidateQueries({ queryKey: ['/search/user'] });
                toast.success("La búsqueda ahora es privada");
            },
            onError: () => toast.error("Error al privatizar la búsqueda")
        }
    });

    const togglePublic = () => {
        if (!data) return;
        if (data.shared) {
            privatizeSearch({ searchId: id! });
        } else {
            shareSearch({ searchId: id! });
        }
    };
    const { mutate: prepareBooking, isPending: isPreparingBooking, error: prepareError, data: bookingData } = usePrepareBooking();

    const [outboundSegmentsCount, setOutboundSegmentsCount] = useState(0);

    const handleReserve = () => {
        window.dispatchEvent(new CustomEvent('flaights:mission:buy-flight'));
        const tokens: { token: string; origin: string; destination: string; departure_date: string }[] = [];

        const collectTokens = (legs: any[]) => {
            let count = 0;
            legs.forEach(leg => {
                if (leg.booking_token) {
                    tokens.push({
                        token: leg.booking_token,
                        origin: leg.origin,
                        destination: leg.destination,
                        departure_date: leg.departure_time.split(' ')[0] // Extract YYYY-MM-DD from YYYY-MM-DD HH:MM
                    });
                    count++;
                }
            });
            return count;
        };

        let outCount = 0;
        if (selectedDeparture) outCount = collectTokens(selectedDeparture.legs);
        if (selectedReturn) collectTokens(selectedReturn.legs);

        if (tokens.length === 0) {
            toast.error(t("searchResults.toast.noBookingOptions"));
            return;
        }

        setOutboundSegmentsCount(outCount);
        setIsBookingModalOpen(true);
        prepareBooking({ data: { tokens: tokens as any } });
        window.dispatchEvent(new CustomEvent('app:buy-flight'));
    };

    const searchData = data;

    const airportsMap = useMemo(() => {
        if (!airportsData) return new Map<string, GlobeAirportResponse>();
        const map = new Map(airportsData.map(a => [a.i, a]));
        return map;
    }, [airportsData]);

    // Extract origin and destination from search criteria or hovered/expanded itinerary to visualize route in Globe
    const globeRoute = useMemo(() => {
        // Hovered takes precedence, then expanded
        const activeItinerary = hoveredItinerary || expandedItinerary;

        if (activeItinerary) {
            const origin = activeItinerary.legs[0]?.origin;
            const destination = activeItinerary.legs[activeItinerary.legs.length - 1]?.destination;
            return { origin, destination };
        }

        if (!searchData) return { origin: undefined, destination: undefined };

        const origin = searchData.origins?.[0] || searchData.departure_itineraries?.[0]?.legs?.[0]?.origin;
        const firstItinerary = searchData.departure_itineraries?.[0];
        const destination = searchData.destinations?.[0] || (firstItinerary ? firstItinerary.legs[firstItinerary.legs.length - 1]?.destination : undefined);

        return { origin, destination };
    }, [searchData, hoveredItinerary, expandedItinerary]);

    const sortItineraries = (itineraries?: ItineraryResponse[]) => {
        if (!itineraries) return [];
        return [...itineraries].sort((a, b) => {
            if (sortBy === 'personalized') return (b.score || 0) - (a.score || 0);
            if (sortBy === 'price') return a.total_price - b.total_price;
            if (sortBy === 'duration') return a.total_duration - b.total_duration;
            return 0;
        });
    };

    const departureItineraries = sortItineraries(searchData?.departure_itineraries);
    const returnItineraries = sortItineraries(searchData?.return_itineraries);

    const isOneWay = useMemo(() => {
        if (!searchData?.return_date) return true;
        if (searchData.status === 'searching') return false;
        return !returnItineraries || returnItineraries.length === 0;
    }, [searchData?.return_date, searchData?.status, returnItineraries]);

    const showLoading = (isLoading && !data) || (isLargeScreen && !isGlobeReady);


    const formatTime = (dateString?: string) => {
        if (!dateString) return "--:--";
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };

    const formatDateForDisplay = (dateStr?: string): string | null => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const formatted = date.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
        // Example: "vie., 24 may." -> "Vie, 24 may"
        return formatted.charAt(0).toUpperCase() + formatted.slice(1).replace(/\./g, '');
    };

    const currentOrigins = useMemo(() => {
        const activeItinerary = hoveredItinerary || expandedItinerary;
        if (activeItinerary) {
            const iata = activeItinerary.legs[0]?.origin;
            const a = iata ? airportsMap.get(iata) : null;
            if (!a) return [];
            return [{
                iata_code: a.i,
                name: a.n,
                city: a.ci,
                location: { coordinates: [a.lo, a.la], type: "Point" }
            } as AirportResponse];
        }
        if (!searchData?.origins) return [];
        return searchData.origins
            .map(iata => {
                const a = airportsMap.get(iata);
                if (!a) return null;
                return {
                    iata_code: a.i,
                    name: a.n,
                    city: a.ci,
                    location: { coordinates: [a.lo, a.la], type: "Point" }
                } as AirportResponse;
            })
            .filter((a): a is AirportResponse => !!a);
    }, [hoveredItinerary, expandedItinerary, searchData?.origins, airportsMap]);

    const currentDestinations = useMemo(() => {
        const activeItinerary = hoveredItinerary || expandedItinerary;
        if (activeItinerary) {
            const iata = activeItinerary.legs[activeItinerary.legs.length - 1]?.destination;
            const a = iata ? airportsMap.get(iata) : null;
            if (!a) return [];
            return [{
                iata_code: a.i,
                name: a.n,
                city: a.ci,
                location: { coordinates: [a.lo, a.la], type: "Point" }
            } as AirportResponse];
        }
        if (!searchData?.destinations) return [];
        return searchData.destinations
            .map(iata => {
                const a = airportsMap.get(iata);
                if (!a) return null;
                return {
                    iata_code: a.i,
                    name: a.n,
                    city: a.ci,
                    location: { coordinates: [a.lo, a.la], type: "Point" }
                } as AirportResponse;
            })
            .filter((a): a is AirportResponse => !!a);
    }, [hoveredItinerary, expandedItinerary, searchData?.destinations, airportsMap]);

    const currentSteps = useMemo(() => {
        const activeItinerary = hoveredItinerary || expandedItinerary;
        if (!activeItinerary || activeItinerary.legs.length < 2) return [];

        const steps: AirportResponse[][] = [];
        for (let i = 0; i < activeItinerary.legs.length - 1; i++) {
            const iata = activeItinerary.legs[i]?.destination;
            const a = iata ? airportsMap.get(iata) : null;
            if (a) {
                steps.push([{
                    iata_code: a.i,
                    name: a.n,
                    city: a.ci,
                    location: { coordinates: [a.lo, a.la], type: "Point" }
                } as AirportResponse]);
            }
        }
        return steps;
    }, [hoveredItinerary, expandedItinerary, airportsMap]);

    const allStepsIata = useMemo(() => currentSteps.flat().map(s => s.iata_code).filter(Boolean) as string[], [currentSteps]);
    const selectedAirports = useMemo(() =>
        [globeRoute.origin, ...allStepsIata, globeRoute.destination].filter(Boolean) as string[],
        [globeRoute.origin, allStepsIata, globeRoute.destination]
    );

    const handleGlobeReady = useCallback(() => setIsGlobeReady(true), []);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-main text-red-500 gap-4 p-4 text-center">
                <AlertCircle size={48} className="opacity-80" />
                <p className="text-lg font-medium">{t("searchResults.error.fetch")}</p>
                <p className="text-sm opacity-70 max-w-md">{error.message}</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-4 px-6 py-2 bg-brand text-content-on-brand rounded-xl font-bold hover:bg-brand-hover transition-colors cursor-pointer"
                >
                    {t("searchResults.error.backToHome")}
                </button>
            </div>
        );
    }


    const handleSelectItinerary = (itinerary: ItineraryResponse, type: 'departure' | 'return') => {
        setExpandedItinerary(null);
        window.dispatchEvent(new CustomEvent('flaights:mission:select-flight'));
        if (type === 'departure') {
            setSelectedDeparture(itinerary);
            if (isOneWay) {
                setSelectionStep('summary');
            } else {
                setSelectionStep('return');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (type === 'return') {
            setSelectedReturn(itinerary);
            setSelectionStep('summary');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleEditDeparture = () => {
        setExpandedItinerary(null);
        setSelectionStep('departure');
        setSelectedDeparture(null);
        setSelectedReturn(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEditReturn = () => {
        setExpandedItinerary(null);
        setSelectionStep('return');
        setSelectedReturn(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleGoBack = () => {
        setExpandedItinerary(null);
        if (selectionStep === 'return') {
            setSelectionStep('departure');
            setSelectedDeparture(null);
        } else if (selectionStep === 'summary') {
            if (isOneWay) {
                setSelectionStep('departure');
                setSelectedDeparture(null);
            } else {
                setSelectionStep('return');
                setSelectedReturn(null);
            }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };


    return (
        <div className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden bg-main lg:bg-black text-content flex lg:block">
            {/* Loading Overlay */}
            <div className={`fixed inset-0 z-loading bg-main flex flex-col items-center justify-center gap-6 transition-opacity duration-700 pointer-events-none ${showLoading ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative flex items-center justify-center">
                    {/* Radar rings — staggered expanding pulses using brand color */}
                    <div className="absolute w-20 h-20 rounded-full border border-brand/40 animate-radar" style={{ animationDelay: '0s' }} />
                    <div className="absolute w-20 h-20 rounded-full border border-brand/25 animate-radar" style={{ animationDelay: '0.8s' }} />
                    <div className="absolute w-20 h-20 rounded-full border border-brand/15 animate-radar" style={{ animationDelay: '1.6s' }} />
                    <svg className="w-10 h-10 text-brand relative z-content" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1l3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                    </svg>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-content-muted text-xs">{t('searchResultsPage.searchingBestRoutes')}</span>
                </div>
                <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                    ))}
                </div>
            </div>

            {/* Mobile Background Globe (Full screen) */}
            <div className="fixed inset-0 z-behind lg:hidden">
                <StarsBackground className="opacity-30" />
            </div>

            {/* Left Column: Results List */}
            {searchData && (
                <div className="relative z-content w-full lg:w-[65%] xl:w-[60%] h-full">
                    <div className="relative w-full h-full overflow-y-auto overflow-x-hidden scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="max-w-3xl mx-auto px-4 pt-18 lg:pt-24 pb-6 lg:pb-10 min-h-full flex flex-col gap-6 lg:gap-8">
                            {/* Header Card */}
                            <div className="sticky top-6 lg:top-8 z-overlay backdrop-blur-2xl bg-main/80 dark:bg-main/70 border border-line p-4 rounded-2xl shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
                                <div className="flex items-center justify-between w-full gap-4">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <button
                                            onClick={selectionStep === 'departure' ? () => navigate(-1) : handleGoBack}
                                            className="shrink-0 p-2.5 bg-surface/50 hover:bg-surface border border-line/30 rounded-xl transition-all group active:scale-95 cursor-pointer"
                                            title={selectionStep === 'departure' ? t('searchResultsPage.backToSearch') : t('searchResultsPage.previousStep')}
                                        >
                                            <ArrowLeft size={20} className="text-content-muted group-hover:text-content" />
                                        </button>
                                        <div className="overflow-hidden">
                                            <h1 className="text-lg md:text-xl font-bold flex items-center gap-3 text-content">
                                                {(selectionStep === 'departure' || selectionStep === 'return') && (
                                                    <>
                                                        <span className="truncate">
                                                            {searchData.origins?.join(' + ') || (searchData.departure_itineraries?.[0]?.legs?.[0]?.origin)}
                                                        </span>
                                                        <Plane className="w-5 h-5 text-brand rotate-45 shrink-0 hidden sm:block" />
                                                        <span className="truncate">
                                                            {searchData.destinations?.join(' + ') || (searchData.departure_itineraries?.[0]?.legs?.at(-1)?.destination)}
                                                        </span>
                                                    </>
                                                )}
                                                {selectionStep === 'summary' && `Resumen`}
                                            </h1>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] md:text-xs text-content-muted font-medium">
                                                {searchData.departure_date && (
                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                        <Calendar size={12} className="text-brand/80" />
                                                        <span>{formatDateForDisplay(searchData.departure_date)}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    {searchData.status === 'searching' && selectionStep === 'departure' && (
                                                        <Loader2 className="w-3 h-3 animate-spin text-brand" />
                                                    )}
                                                    <p className="whitespace-nowrap">
                                                        {selectionStep === 'departure' && searchData.status === 'searching' && 'Buscando...'}
                                                        {selectionStep === 'departure' && searchData.status !== 'searching' && `${departureItineraries?.length || 0} ida`}
                                                        {selectionStep === 'return' && `${returnItineraries?.length || 0} vuelta`}
                                                        {selectionStep === 'summary' && 'Confirma'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions: Privacy Toggle & Share Button */}
                                    <div className="shrink-0 flex items-center gap-2">
                                        {isAuthenticated && user._id === data?.user_id && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    togglePublic();
                                                }}
                                                disabled={isSharingPublic || isPrivatizingPublic}
                                                className={`p-2.5 border rounded-xl transition-all group active:scale-95 cursor-pointer ${data?.shared
                                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                                                    : 'bg-surface/50 hover:bg-surface border-line/30 text-content-muted hover:text-brand'
                                                    }`}
                                                title={data?.shared ? t('share.makePrivate') : t('share.makePublic')}
                                            >
                                                {isSharingPublic || isPrivatizingPublic ? (
                                                    <Loader2 size={18} className="animate-spin" />
                                                ) : data?.shared ? (
                                                    <GlobeIcon size={18} />
                                                ) : (
                                                    <Lock size={18} />
                                                )}
                                            </button>
                                        )}

                                        <SmartPopover
                                            isOpen={isSharing}
                                            setIsOpen={setIsSharing}
                                            preferredAlign="right"
                                            trigger={
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setIsSharing(!isSharing);
                                                    }}
                                                    className={`p-2.5 border rounded-xl transition-all group active:scale-95 cursor-pointer ${isSharing ? 'bg-brand border-brand' : 'bg-surface/50 hover:bg-surface border-line/30'}`}
                                                    title={t('share.shareFlightSearch')}
                                                >
                                                    <Share2 size={18} className={isSharing ? 'text-white' : 'text-content-muted group-hover:text-brand'} />
                                                </button>
                                            }
                                        >
                                            <div className="p-2 flex flex-col gap-1 min-w-[240px]">
                                                {!data?.shared && isAuthenticated && user._id === data?.user_id && (
                                                    <div className="px-3 py-2 border-b border-line mb-1">
                                                        <p className="text-[10px] text-amber-500 font-bold leading-tight">
                                                            {t('share.autoPublicDisclaimer')}
                                                        </p>
                                                    </div>
                                                )}

                                                {isAuthenticated && user.friends.length > 0 && (
                                                    <>
                                                        <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-content-muted/40">Enviar a amigos</p>
                                                        <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                                            {user.friends.filter((f): f is FriendUser => typeof f !== 'string').map(friend => (
                                                                <button
                                                                    key={friend._id}
                                                                    onClick={async () => {
                                                                        // Si es privada y soy el dueño, la hacemos pública antes de compartir
                                                                        if (!data?.shared && user._id === data?.user_id) {
                                                                            try {
                                                                                await shareSearch({ searchId: id! });
                                                                            } catch (err) {
                                                                                return; // No compartimos si falla al hacerla pública
                                                                            }
                                                                        }

                                                                        // Si sigue siendo privada (no soy el dueño), no dejamos compartir
                                                                        if (!data?.shared && user._id !== data?.user_id) {
                                                                            toast.error("No puedes compartir una búsqueda privada");
                                                                            return;
                                                                        }

                                                                        sendMessage({
                                                                            otherUserId: friend._id,
                                                                            data: { content: `SHARE_SEARCH:${id}:${data!.origins[0]}:${data!.destinations[0]}` }
                                                                        });
                                                                    }}
                                                                    className="flex items-center gap-2 p-2 hover:bg-surface rounded-xl transition-all text-left w-full group/friend cursor-pointer"
                                                                >
                                                                    <UserAvatar user={friend} size={32} />
                                                                    <span className="text-sm font-bold group-hover/friend:text-brand transition-colors">{friend.username}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="h-px bg-line my-1" />
                                                    </>
                                                )}

                                                <button
                                                    onClick={async () => {
                                                        window.dispatchEvent(new CustomEvent('flaights:mission:share-from-results'));

                                                        // Si es privada y soy el dueño, la hacemos pública antes de compartir
                                                        if (!data?.shared && isAuthenticated && user._id === data?.user_id) {
                                                            try {
                                                                await shareSearch({ searchId: id! });
                                                            } catch (err) {
                                                                return; // No compartimos si falla al hacerla pública
                                                            }
                                                        }

                                                        const url = window.location.href;
                                                        const shareData = {
                                                            title: 'flAIghts - Búsqueda de vuelos',
                                                            text: '¡Mira los vuelos que he encontrado en flAIghts!',
                                                            url: url
                                                        };

                                                        const canShareNative = typeof navigator.share === 'function' &&
                                                            (typeof navigator.canShare !== 'function' || navigator.canShare(shareData));

                                                        if (canShareNative) {
                                                            try {
                                                                await navigator.share(shareData);
                                                                setIsSharing(false);
                                                                return;
                                                            } catch (err) {
                                                                console.error('Error sharing native:', err);
                                                            }
                                                        }

                                                        try {
                                                            await navigator.clipboard.writeText(url);
                                                            toast.success('Enlace copiado', { description: 'El enlace se ha copiado al portapapeles.' });
                                                            setIsSharing(false);
                                                        } catch (err) {
                                                            console.error('Error copying to clipboard:', err);
                                                            toast.error('Error al compartir', { description: 'No se pudo copiar el enlace.' });
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 p-2.5 hover:bg-surface rounded-xl transition-all text-left w-full group/share cursor-pointer"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand group-hover/share:bg-brand group-hover/share:text-white transition-colors">
                                                        <Share2 size={16} />
                                                    </div>
                                                    <span className="text-sm font-bold group-hover/share:text-brand transition-colors">Compartir enlace</span>
                                                </button>
                                            </div>
                                        </SmartPopover>
                                    </div>
                                </div>

                                {/* Sorting Controls - Bottom row on mobile */}
                                {selectionStep !== 'summary' && (
                                    <div className="flex items-center justify-between sm:justify-start gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-line/30">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] md:text-xs font-bold text-content-muted uppercase tracking-wider">{t('searchResultsPage.orderBy')}</span>
                                            <div className="flex items-center gap-1 bg-surface/50 p-1 rounded-xl border border-line/30">
                                                <button
                                                    onClick={() => setSortBy('personalized')}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer ${sortBy === 'personalized'
                                                        ? 'bg-brand text-content-on-brand shadow-sm'
                                                        : 'text-content-muted hover:text-content hover:bg-main'
                                                        }`}
                                                >
                                                    <Star size={14} className={sortBy === 'personalized' ? 'fill-current' : ''} />
                                                    <span>{t('searchResultsPage.personalized')}</span>
                                                </button>
                                                <button
                                                    onClick={() => setSortBy('price')}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${sortBy === 'price'
                                                        ? 'bg-brand text-content-on-brand shadow-sm'
                                                        : 'text-content-muted hover:text-content hover:bg-main'
                                                        }`}
                                                >
                                                    <DollarSign size={12} />
                                                    <span>{t('searchResultsPage.price')}</span>
                                                </button>
                                                <button
                                                    onClick={() => setSortBy('duration')}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${sortBy === 'duration'
                                                        ? 'bg-brand text-content-on-brand shadow-sm'
                                                        : 'text-content-muted hover:text-content hover:bg-main'
                                                        }`}
                                                >
                                                    <Clock size={12} />
                                                    <span>{t('searchResultsPage.duration')}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Results Columns */}
                            <div className="grid grid-cols-1 gap-10 pb-24">

                                {selectionStep === 'summary' && selectedDeparture && (
                                    <div className="space-y-8 animate-in fade-in duration-500">
                                        <SelectedFlightSummary
                                            itinerary={selectedDeparture}
                                            type="Ida"
                                            airportsMap={airportsMap}
                                            formatTime={formatTime}
                                            formatDuration={formatDuration}
                                            title={t('searchResultsPage.selectedFlight', { type: t('common.outbound') })}
                                            onEdit={handleEditDeparture}
                                        />
                                        {selectedReturn && (
                                            <SelectedFlightSummary
                                                itinerary={selectedReturn}
                                                type="Vuelta"
                                                airportsMap={airportsMap}
                                                formatTime={formatTime}
                                                formatDuration={formatDuration}
                                                title={t('searchResultsPage.selectedFlight', { type: t('common.return') })}
                                                onEdit={handleEditReturn}
                                            />
                                        )}
                                        <div className="bg-main/80 dark:bg-main/60 backdrop-blur-xl border border-line rounded-2xl shadow-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="text-center sm:text-left">
                                                <span className="text-sm font-bold text-content-muted uppercase tracking-wider">{t('searchResultsPage.tripTotalPrice')}</span>
                                                <p className="text-4xl font-black text-brand">
                                                    {(selectedDeparture.total_price + (selectedReturn?.total_price || 0)).toFixed(2)}€
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleReserve}
                                                className="w-full sm:w-auto px-8 py-4 bg-brand hover:bg-brand-hover text-white text-base font-bold rounded-2xl shadow-lg shadow-brand/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                            >
                                                {t('searchResultsPage.reserve')}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Departure Flights */}
                                {selectionStep === 'departure' && departureItineraries && departureItineraries.length > 0 && (
                                    <div className="space-y-4 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-100">
                                        <h2 className="text-xl font-bold text-content flex items-center gap-3 ml-2">
                                            <div className="p-2 bg-origin/20 rounded-lg">
                                                <Plane className="w-5 h-5 text-origin -rotate-45" />
                                            </div>
                                            {t('common.outboundFlights')}
                                        </h2>
                                        <div className="space-y-4">
                                            {departureItineraries.map((itinerary, index) => (
                                                <FlightCard
                                                    key={index}
                                                    itinerary={itinerary}
                                                    formatTime={formatTime}
                                                    formatDuration={formatDuration}
                                                    airportsMap={airportsMap}
                                                    onHover={setHoveredItinerary}
                                                    onExpandChange={setExpandedItinerary}
                                                    onSelect={(it) => handleSelectItinerary(it, 'departure')}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Return Flights */}
                                {selectionStep === 'return' && returnItineraries && returnItineraries.length > 0 && (
                                    <>
                                        {selectedDeparture && (
                                            <SelectedFlightSummary
                                                itinerary={selectedDeparture}
                                                type="Ida"
                                                airportsMap={airportsMap}
                                                formatTime={formatTime}
                                                formatDuration={formatDuration}
                                                title={t('searchResultsPage.selectedFlight', { type: t('common.outbound') })}
                                                onEdit={handleEditDeparture}
                                            />
                                        )}

                                        <div className="space-y-4 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-200">
                                            <h2 className="text-xl font-bold text-content flex items-center gap-3 ml-2">
                                                <div className="p-2 bg-destination/20 rounded-lg">
                                                    <Plane className="w-5 h-5 text-destination rotate-135" />
                                                </div>
                                                {t('common.returnFlights')}
                                            </h2>
                                            <div className="space-y-4">
                                                {returnItineraries.map((itinerary, index) => (
                                                    <FlightCard
                                                        key={index}
                                                        itinerary={itinerary}
                                                        formatTime={formatTime}
                                                        formatDuration={formatDuration}
                                                        airportsMap={airportsMap}
                                                        onHover={setHoveredItinerary}
                                                        onExpandChange={setExpandedItinerary}
                                                        onSelect={(it) => handleSelectItinerary(it, 'return')}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {selectionStep === 'return' && searchData.status === 'searching' && (!returnItineraries || returnItineraries.length === 0) && (
                                    <div className="flex flex-col items-center justify-center py-20 bg-main/40 backdrop-blur-md rounded-3xl border border-line text-center text-content-muted mx-4">
                                        <Loader2 size={48} className="mb-4 opacity-50 text-brand animate-spin" />
                                        <h3 className="text-xl font-semibold text-content mb-2">{t('searchResultsPage.searchingMore')}</h3>
                                        <p className="text-sm opacity-70">{t('searchResultsPage.searchingBestRoutes')}</p>
                                    </div>
                                )}

                                {selectionStep === 'departure' && searchData.status === 'searching' && !departureItineraries?.length && (
                                    <div className="flex flex-col items-center justify-center py-20 bg-main/40 backdrop-blur-md rounded-3xl border border-line text-center text-content-muted mx-4">
                                        <Loader2 size={48} className="mb-4 opacity-50 text-brand animate-spin" />
                                        <h3 className="text-xl font-semibold text-content mb-2">{t('searchResultsPage.searchingMore')}</h3>
                                        <p className="text-sm opacity-70">{t('searchResultsPage.searchingBestRoutes')}</p>
                                    </div>
                                )}
                                {selectionStep === 'departure' && searchData.status === 'completed' && !departureItineraries?.length && (
                                    <div className="flex flex-col items-center justify-center py-20 bg-main/40 backdrop-blur-md rounded-3xl border border-line text-center text-content-muted mx-4">
                                        <AlertCircle size={48} className="mb-4 opacity-50 text-content" />
                                        <h3 className="text-xl font-semibold text-content mb-2">{t("searchResults.error.noFlights")}</h3>
                                        <p className="text-sm opacity-70 px-4">{t("searchResults.error.tryAgain")}</p>
                                    </div>
                                )}

                                {selectionStep === 'return' && searchData.status === 'completed' && !returnItineraries?.length && (
                                    <div className="flex flex-col items-center justify-center py-20 bg-main/40 backdrop-blur-md rounded-3xl border border-line text-center text-content-muted mx-4">
                                        <AlertCircle size={48} className="mb-4 opacity-50 text-content" />
                                        <h3 className="text-xl font-semibold text-content mb-2">No se han encontrado vuelos de vuelta</h3>
                                        <p className="text-sm opacity-70 px-4">No se han encontrado vuelos de vuelta para esa búsqueda, vuelve a intentarlo con otros parámetros de búsqueda.</p>
                                    </div>
                                )}

                                {searchData.status === 'failed' && (
                                    <div className="flex flex-col items-center justify-center py-20 bg-red-500/5 backdrop-blur-md rounded-3xl border border-red-500/20 text-center text-red-500/70 mx-4">
                                        <AlertCircle size={48} className="mb-4 opacity-50" />
                                        <h3 className="text-xl font-semibold text-red-500 mb-2">Búsqueda fallida</h3>
                                        <p className="text-sm px-4">Hubo un problema al procesar tu búsqueda. Por favor, intenta de nuevo más tarde o con otros parámetros.</p>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Globe (Fixed Full Screen with Offset) */}
            <div className={`fixed inset-0 z-behind transition-opacity duration-700 pointer-events-none ${!isLargeScreen ? 'opacity-0' : 'opacity-100'}`}>
                <Globe
                    selectedAirports={selectedAirports}
                    origins={currentOrigins}
                    destinations={currentDestinations}
                    steps={currentSteps}
                    interactive={false}
                    horizontalOffset={isLargeScreen ? 450 : 0}
                    onReady={handleGlobeReady}
                />
            </div>

            <BookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                isLoading={isPreparingBooking}
                bookingData={bookingData || null}
                outboundSegmentsCount={outboundSegmentsCount}
                error={prepareError}
            />
        </div>
    );
}
