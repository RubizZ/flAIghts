import { useState, useEffect, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Search, Map, Calendar, PlaneTakeoff, Plus, Minus, Info, X, ChevronDown } from "lucide-react";

import Globe from "@/components/Globe";
import StarsBackground from "@/components/ui/StarsBackground";
import { UnifiedSelection, getAllIatas, isAirport, isCity, getEntityId, getEntityName } from "@/types/selection";
import { useGetGlobeAirports } from "@/api/generated/openapi/airports";
import { useGeneticTrip } from "@/api/generated/openapi/search";
import FlightSearchInput from "@/components/search/FlightSearchInput";
import DateSearchInput from "@/components/search/DateSearchInput";
import GlobeLoadingScreen from "@/components/ui/GlobeLoadingScreen";
import { useNavLogo } from "@/context/NavLogoContext";

export default function GeneticTrip() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { hideLogo, showLogo } = useNavLogo();

    // Form State
    const [origins, setOrigins] = useState<UnifiedSelection[]>([]);
    const [cities, setCities] = useState<UnifiedSelection[]>([]);
    const [startDate, setStartDate] = useState("");
    const [daysPerCity, setDaysPerCity] = useState<number>(3);

    // UI State
    const [activeDatePopover, setActiveDatePopover] = useState(false);
    const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
    const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
    const [explanationVisible, setExplanationVisible] = useState(window.innerWidth >= 1024);
    const [selectingType, setSelectingType] = useState<'origin' | 'destination' | null>(null);
    const [globeReady, setGlobeReady] = useState(false);

    const { data: globeAirports } = useGetGlobeAirports({
        query: { staleTime: Infinity, refetchOnWindowFocus: false }
    });

    // Initial load from URL
    useEffect(() => {
        if (!globeAirports) return;

        const urlOrigins = searchParams.get("origins")?.split(",").filter(Boolean) || [];
        const urlCities = searchParams.get("destinations")?.split(",").filter(Boolean) || [];
        const urlDate = searchParams.get("date") || "";
        const urlDays = parseInt(searchParams.get("days") || "3");

        if (urlOrigins.length > 0) {
            const resolved = urlOrigins.map(iata => globeAirports.find(a => a.i === iata)).filter(Boolean) as any[];
            if (resolved.length > 0) setOrigins(resolved);
        }

        if (urlCities.length > 0) {
            const resolved = urlCities.map(iata => globeAirports.find(a => a.i === iata)).filter(Boolean) as any[];
            if (resolved.length > 0) setCities(resolved);
        }

        if (urlDate) setStartDate(urlDate);
        if (urlDays) setDaysPerCity(urlDays);
    }, [globeAirports]); // Only run when globeAirports are ready

    // Dispatch opened event for missions
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('flaights:mission:genetic-trip-opened'));
    }, []);

    // Dispatch city added event for missions
    useEffect(() => {
        if (cities.length > 0) {
            window.dispatchEvent(new CustomEvent('flaights:mission:genetic-trip-city-added', {
                detail: { count: cities.length }
            }));
        }
    }, [cities.length]);

    // Sync state to URL
    useEffect(() => {
        const params = new URLSearchParams(searchParams);

        const originsIata = getAllIatas(origins).join(",");
        if (originsIata) params.set("origins", originsIata);
        else params.delete("origins");

        const citiesIata = getAllIatas(cities).join(",");
        if (citiesIata) params.set("destinations", citiesIata);
        else params.delete("destinations");

        if (startDate) params.set("date", startDate);
        else params.delete("date");

        if (daysPerCity !== 3) params.set("days", daysPerCity.toString());
        else params.delete("days");

        setSearchParams(params, { replace: true });
    }, [origins, cities, startDate, daysPerCity]);

    useEffect(() => {
        const handleResize = () => {
            setIsLargeScreen(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const today = new Date().toISOString().split('T')[0]!;

    // Mutation
    const { mutate: performGeneticTrip, isPending } = useGeneticTrip({
        mutation: {
            onSuccess: (data) => {
                navigate(`/search/${data._id}`);
            },
            onError: (error: any) => {
                console.error(error);
                toast.error(error?.message || t("searchFlight.toast.searchError"));
            }
        }
    });

    // Manage Globe interactions
    useEffect(() => {
        if (isSelectingOnMap) {
            hideLogo();
        } else {
            showLogo();
        }
        return () => showLogo();
    }, [isSelectingOnMap, hideLogo, showLogo]);

    // Derived states for map
    const selectedAirports = useMemo(() => [
        ...getAllIatas(origins),
        ...getAllIatas(cities),
    ].filter(Boolean) as string[], [origins, cities]);

    const handleSearch = () => {
        if (origins.length === 0 || cities.length === 0 || !startDate) {
            toast.error(t("searchFlight.validation.completeFields"));
            return;
        }

        const originIata = getAllIatas(origins)[0]!;
        const citiesIatas = getAllIatas(cities);

        performGeneticTrip({
            data: {
                origin: originIata,
                cities: citiesIatas,
                startDate: new Date(startDate).toISOString() as any, // backend expects Date but handles string serialization
                daysPerCity,
                source: "manual"
            }
        });

        window.dispatchEvent(new CustomEvent('flaights:mission:genetic-trip-performed'));
    };

    const handleStartMapSelection = (type: 'origin' | 'destination') => {
        setSelectingType(type);
        setIsSelectingOnMap(true);
        window.dispatchEvent(new CustomEvent('flaights:mission:open-map'));
    };

    const handleMapSelect = (airport: any) => {
        if (selectingType === 'origin') {
            if (getAllIatas(cities).includes(airport.iata_code)) {
                toast.error(t("searchFlight.validation.sameOriginDestination"));
                return;
            }
            setOrigins([airport]);
        } else if (selectingType === 'destination') {
            if (getAllIatas(origins).includes(airport.iata_code)) {
                toast.error(t("searchFlight.validation.sameOriginDestination"));
                return;
            }
            if (getAllIatas(cities).includes(airport.iata_code)) {
                toast.error(t("searchFlight.validation.alreadySelectedDestination"));
                return;
            }
            setCities([...cities, airport]);
        }
        setSelectingType(null);
        setIsSelectingOnMap(false);
        window.dispatchEvent(new CustomEvent('flaights:mission:select-on-map', { detail: { airport } }));
    };

    return (
        <div className={`absolute inset-0 overflow-hidden transition-colors duration-700 ${!isLargeScreen && !isSelectingOnMap ? 'bg-main' : 'bg-black'}`}>
            <Helmet>
                <title>{t("seo.geneticTrip.title")}</title>
                <meta name="description" content={t("seo.geneticTrip.description")} />
            </Helmet>
            <GlobeLoadingScreen
                isVisible={!globeReady}
                text={t("searchFlight.loading.loadingGlobe")}
                className="absolute inset-0 z-app-loading bg-main"
            />
            <StarsBackground className={`transition-opacity duration-1000 ${!isLargeScreen && !isSelectingOnMap ? 'opacity-30' : 'opacity-0'}`} />

            {/* Background Map layer */}
            <div className={`absolute inset-0 z-behind transition-opacity duration-700 ${!isLargeScreen && !isSelectingOnMap ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <Globe
                    onAirportSelect={selectingType ? handleMapSelect : undefined}
                    selectedAirports={selectedAirports}
                    origins={origins}
                    destinations={cities}
                    interactive={isSelectingOnMap}
                    horizontalOffset={isSelectingOnMap ? 0 : (isLargeScreen ? 300 : 0)}
                    onReady={() => setGlobeReady(true)}
                />
            </div>

            <div className={`absolute inset-0 z-content transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) flex flex-col items-center lg:items-start justify-center pointer-events-none p-4 lg:p-12 lg:pl-24 ${isSelectingOnMap ? `opacity-0 ${isLargeScreen ? '-translate-x-[150%]' : '-translate-y-[150%]'} scale-95` : 'opacity-100 pt-24 pb-24 lg:py-0'}`}>
                <div
                    className={`relative pointer-events-auto premium-glass rounded-4xl p-6 lg:p-8 flex flex-col gap-3 lg:gap-6 w-full max-w-[min(96vw,580px)] shadow-2xl border border-line/50 overflow-y-auto custom-scrollbar max-h-[calc(100svh-140px)] transition-all duration-700 ${!isSelectingOnMap ? 'translate-y-0 scale-100' : 'translate-y-20 scale-90'}`}
                >
                    {/* Header */}
                    <div className="flex flex-col gap-2">
                        <div
                            className="flex items-center justify-between cursor-pointer group"
                            onClick={() => setExplanationVisible(!explanationVisible)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-brand/10 border border-brand/20 group-hover:bg-brand/20 transition-colors">
                                    <Map className="text-brand" size={24} />
                                </div>
                                <h1 className="text-xl lg:text-3xl font-black text-content tracking-tight">{t("geneticTripPage.title")}</h1>
                            </div>
                            <div className={`p-2 rounded-xl transition-all flex items-center gap-2 ${explanationVisible ? 'bg-brand/10 text-brand' : 'hover:bg-surface text-content-muted'}`}>
                                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">
                                    {explanationVisible ? t("common.hide") : t("common.info")}
                                </span>
                                <Info size={18} className={explanationVisible ? 'animate-pulse' : ''} />
                            </div>
                        </div>
                        <div className={`text-sm text-content-muted space-y-2 transition-all duration-500 ease-in-out overflow-hidden ${explanationVisible ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0 mt-0'}`}>
                            <p>
                                <Trans i18nKey="geneticTripPage.description1">
                                    Perfecto para mochileros o viajes largos. Descubre la <span className="text-brand font-black">ruta óptima</span> para visitar varias ciudades pagando lo mínimo.
                                </Trans>
                            </p>
                            <p className="text-xs opacity-80">
                                {t("geneticTripPage.description2")}
                            </p>
                        </div>
                    </div>

                    {/* Form Controls */}
                    <div className="flex flex-col gap-3 lg:gap-8">
                        {/* STEP 1: Origin & Date */}
                        <div className="flex flex-col gap-2 lg:gap-5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm shrink-0">1</div>
                                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-content/60">
                                    {t("geneticTripPage.step1")}
                                </h2>
                                <div className="h-px grow bg-line/20" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 lg:gap-6 w-full">
                                <div className="flex flex-col gap-0.5 lg:gap-2 lg:col-span-8 min-w-0">
                                    <label className="h-6 text-[11px] font-bold uppercase tracking-wider text-content-muted ml-1 flex items-center gap-1.5 shrink-0">
                                        <PlaneTakeoff size={12} className="text-brand" />
                                        {t("common.origin")} <span className="text-brand">*</span>
                                    </label>
                                    <FlightSearchInput
                                        type="origin"
                                        value={origins}
                                        onChange={setOrigins}
                                        onMapClick={() => handleStartMapSelection('origin')}
                                        isMapSelecting={selectingType === 'origin'}
                                        otherSelected={cities}
                                        className="h-14 w-full"
                                        maxSelections={1}
                                        label=""
                                    />
                                </div>

                                <div className="flex flex-col gap-0.5 lg:gap-2 lg:col-span-4 min-w-0">
                                    <label className="h-6 text-[11px] font-bold uppercase tracking-wider text-content-muted ml-1 flex items-center gap-1.5 shrink-0">
                                        <Calendar size={12} className="text-brand" />
                                        {t("geneticTripPage.startDate")} <span className="text-brand">*</span>
                                    </label>
                                    <DateSearchInput
                                        type="departure"
                                        value={startDate}
                                        onChange={(date) => {
                                            setStartDate(date);
                                            setActiveDatePopover(false);
                                        }}
                                        minDate={today}
                                        isOpen={activeDatePopover}
                                        setIsOpen={setActiveDatePopover}
                                        className="h-14 w-full"
                                        label=""
                                    />
                                </div>
                            </div>
                        </div>

                        {/* STEP 2: Destinations & Days */}
                        <div className="flex flex-col gap-2 lg:gap-5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm shrink-0">2</div>
                                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-content/60">
                                    {t("geneticTripPage.step2")}
                                </h2>
                                <div className="h-px grow bg-line/20" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 lg:gap-6 w-full items-start">
                                <div className="flex flex-col gap-0.5 lg:gap-2 lg:col-span-8 min-w-0">
                                    <label className="h-6 text-[11px] font-bold uppercase tracking-wider text-content-muted ml-1 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-1.5">
                                            <Map size={12} className="text-brand" />
                                            {t("common.destinations")} <span className="text-brand">*</span>
                                        </div>
                                        <span className="text-[8px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-md font-bold border border-brand/20 uppercase tracking-tighter">
                                            {cities.length} {t("common.selected")}
                                        </span>
                                    </label>
                                    <div className="flex flex-col group w-full">
                                        <FlightSearchInput
                                            type="destination"
                                            value={cities}
                                            onChange={setCities}
                                            onMapClick={() => handleStartMapSelection('destination')}
                                            isMapSelecting={selectingType === 'destination'}
                                            otherSelected={origins}
                                            className={`h-14 w-full ${cities.length > 0 ? '!rounded-b-none !border-b-transparent shadow-none' : ''}`}
                                            hideSelections={true}
                                            maxSelections={5}
                                            label=""
                                        />
                                        {cities.length > 0 && (
                                            <div className="premium-input-bottom flex flex-col gap-2 animate-in fade-in duration-300 w-full">
                                                <div className="h-px -mx-2.5 lg:-mx-3.5 bg-line/30" />
                                                <div className="flex flex-wrap gap-2">
                                                    {cities.map((city, idx) => (
                                                        <div
                                                            key={`${getEntityId(city)}-${idx}`}
                                                            className="flex items-center gap-1.5 bg-brand/10 border border-brand/20 px-3 py-1.5 rounded-xl shrink-0 animate-in zoom-in-95 duration-200"
                                                        >
                                                            <span className="text-xs font-bold text-brand whitespace-nowrap">
                                                                {isCity(city) ? city.name : (city.iata_code || getEntityName(city))}
                                                            </span>
                                                            <div className="w-[1px] h-3 bg-brand/20 ml-0.5" />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newCities = [...cities];
                                                                    newCities.splice(idx, 1);
                                                                    setCities(newCities);
                                                                }}
                                                                className="text-brand hover:text-brand-dark transition-colors cursor-pointer p-0.5"
                                                                title={t("common.remove")}
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-0.5 lg:gap-2 lg:col-span-4 min-w-0">
                                    <label className="h-6 text-[11px] font-bold uppercase tracking-wider text-content-muted ml-1 flex items-center gap-1.5 shrink-0">
                                        <Info size={12} className="text-brand" />
                                        {t("geneticTripPage.daysPerCity")}
                                    </label>
                                    <div className="premium-input flex items-center justify-between h-14 w-full rounded-2xl px-4 transition-colors group focus-within:ring-2 focus-within:ring-brand/20">
                                        <button
                                            type="button"
                                            onClick={() => setDaysPerCity(Math.max(1, daysPerCity - 1))}
                                            className="p-1.5 rounded-xl hover:bg-brand/10 hover:text-brand text-content-muted transition-colors cursor-pointer"
                                        >
                                            <Minus size={18} />
                                        </button>
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="text-lg font-black text-content tabular-nums">{daysPerCity}</span>
                                            <span className="text-[9px] uppercase tracking-wider text-content-muted font-bold -mt-1">{t("common.days")}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setDaysPerCity(Math.min(30, daysPerCity + 1))}
                                            className="p-1.5 rounded-xl hover:bg-brand/10 hover:text-brand text-content-muted transition-colors cursor-pointer"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Search Button */}
                        <button
                            onClick={handleSearch}
                            disabled={isPending || origins.length === 0 || cities.length === 0 || !startDate}
                            className="relative group flex items-center justify-center gap-2 bg-brand text-content-on-brand rounded-2xl font-bold py-4 overflow-hidden shadow-[0_15px_40px_rgba(var(--brand-rgb),0.3)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed cursor-pointer"
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            {isPending ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="tracking-wide">{t("geneticTripPage.calculating")}</span>
                                </div>
                            ) : (
                                <>
                                    <Search size={20} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-lg tracking-wide">{t("geneticTripPage.findRoute")}</span>
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>

            {/* Cancel Map Selection Overlay button */}
            <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-sticky transition-all duration-500 ${isSelectingOnMap ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-90 pointer-events-none'}`}>
                <button
                    onClick={() => {
                        setIsSelectingOnMap(false);
                        setSelectingType(null);
                    }}
                    className="flex items-center gap-3 bg-surface/90 backdrop-blur-2xl border border-line px-6 py-3 rounded-full shadow-2xl hover:bg-surface active:scale-95 transition-all cursor-pointer group"
                >
                    <Plus size={20} className="text-red-500 rotate-45 group-hover:rotate-135 transition-transform duration-500" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-content/90 whitespace-nowrap">
                        {t("common.cancel")}
                    </span>
                </button>
            </div>
        </div>
    );
}
