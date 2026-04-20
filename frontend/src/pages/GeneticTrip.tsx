import { useState } from "react";
import { MapPin, Calendar as CalendarIcon, Plus, Trash2, Zap, ArrowRight, X, RotateCcw, Building2, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import Calendar from "@/components/ui/Calendar";
import { AirportResponse } from "@/api/generated/openapi/model";
import { toast } from "sonner";
import { useGeneticTrip } from "@/api/generated/openapi/search";

export default function GeneticTrip() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [origin, setOrigin] = useState<AirportResponse | null>(null);
    const [cities, setCities] = useState<AirportResponse[]>([]);
    const [newCity, setNewCity] = useState<AirportResponse | null>(null);
    const [startDate, setStartDate] = useState("");
    const [isStartDateOpen, setIsStartDateOpen] = useState(false);
    const [daysPerCity, setDaysPerCity] = useState(2);

    const today = new Date().toISOString().split('T')[0];

    const { mutate: geneticRequest, isPending } = useGeneticTrip({
        mutation: {
            onSuccess: (data) => {
                toast.success(t("searchFlight.geneticTrip.toast.success"));
                navigate(`/search/${data._id}`);
            },
            onError: (error: any) => {
                console.error(error);
                toast.error(error?.message || t("searchFlight.geneticTrip.toast.error"));
            }
        }
    });

    const handleAddCity = (airport: AirportResponse | null) => {
        if (!airport) return;
        const iata = airport.iata_code;
        if (iata === origin?.iata_code || cities.some(c => c.iata_code === iata)) {
            toast.error(t("searchFlight.validation.sameOriginDestination"));
            return false;
        }
        setCities([...cities, airport]);
        setNewCity(null);
        return true;
    };

    const handleRemoveCity = (index: number) => {
        setCities(cities.filter((_, i) => i !== index));
    };

    const handleFormSubmit = () => {
        if (!origin || cities.length === 0 || !startDate || daysPerCity <= 0) {
            toast.error(t("searchFlight.validation.completeFields"));
            return;
        }
        geneticRequest({
            data: {
                origin: origin.iata_code,
                cities: cities.map(c => c.iata_code),
                startDate,
                daysPerCity
            }
        });
    };

    return (
        <div className="flex flex-col max-w-6xl mx-auto w-full p-6 sm:p-10 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2 border-b border-line/20">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand text-content-on-brand rounded-2xl shadow-[0_0_20px_rgba(var(--brand-rgb),0.3)]">
                            <Zap size={28} />
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-content tracking-tight">{t("searchFlight.geneticTrip.modalTitle")}</h1>
                    </div>
                    <p className="text-content-muted text-lg max-w-2xl leading-relaxed">
                        {t("searchFlight.geneticTrip.modalSubtitle")}
                    </p>
                </div>
                
                <div className="flex items-center gap-2 bg-surface/50 border border-line px-4 py-2 rounded-xl text-xs font-bold text-content-muted uppercase tracking-widest hidden sm:flex">
                    <HelpCircle size={14} className="text-brand/60" />
                    <span>{t('geneticTripPage.betaBadge')}</span>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Side: Configuration (8 columns) */}
                <div className="lg:col-span-8 flex flex-col gap-10">
                    
                    {/* Step 1: Origin Selection */}
                    <section className="flex flex-col gap-5">
                        <div className="flex items-center gap-3 px-1">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand text-content-on-brand text-[10px] font-black">1</span>
                            <h2 className="text-sm font-bold text-content uppercase tracking-[0.2em]">{t("searchFlight.geneticTrip.originLabel")}</h2>
                        </div>

                        {origin ? (
                            <div className="premium-glass p-1 rounded-[2rem] border border-brand/20 shadow-xl group overflow-hidden animate-in zoom-in-95 duration-500">
                                <div className="flex items-center justify-between p-6 bg-brand/5 rounded-[1.8rem]">
                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                                                <Building2 size={32} />
                                            </div>
                                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-surface border-2 border-brand flex items-center justify-center shadow-lg">
                                                <MapPin size={14} className="text-brand" />
                                            </div>
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl font-black text-content tracking-tighter">{origin.iata_code}</span>
                                                <div className="h-1 w-1 rounded-full bg-content-muted/30" />
                                                <span className="text-sm font-bold text-brand uppercase tracking-widest">{origin.city}</span>
                                            </div>
                                            <span className="text-content-muted font-medium truncate opacity-80">{origin.name}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setOrigin(null)}
                                        className="p-3 bg-surface border border-line rounded-2xl text-content-muted hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-all cursor-pointer group/btn"
                                        title={t('geneticTripPage.changeOrigin')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <RotateCcw size={18} className="group-hover/btn:rotate-[-90deg] transition-transform duration-300" />
                                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{t('geneticTripPage.change')}</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="group relative flex items-center gap-5 bg-surface/40 border-2 border-line/50 rounded-3xl px-7 py-6 transition-all hover:border-brand/40 focus-within:border-brand focus-within:bg-main focus-within:shadow-[0_0_30px_rgba(var(--brand-rgb),0.1)]">
                                <MapPin className="text-brand/60 shrink-0 group-focus-within:text-brand transition-colors" size={24} />
                                <AirportAutocomplete
                                    value={[]}
                                    onChange={(airports) => {
                                        const airport = airports[airports.length - 1] || null;
                                        if (airport && cities.some(c => c.iata_code === airport.iata_code)) {
                                            toast.error(t("searchFlight.validation.sameOriginDestination"));
                                            return;
                                        }
                                        setOrigin(airport);
                                    }}
                                    otherSelected={cities}
                                    placeholder={t("searchFlight.geneticTrip.originPlaceholder")}
                                    className="bg-transparent border-none p-0 text-content placeholder:text-content-muted/40 focus:outline-none w-full font-bold text-xl tracking-tight"
                                />
                                <div className="absolute right-6 flex items-center gap-2.5 px-3 py-1.5 bg-brand/5 border border-brand/10 rounded-xl text-[10px] font-black text-brand uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    {t('geneticTripPage.startingPoint')}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Step 2: Date & Settings */}
                    <section className="flex flex-col gap-6">
                        <div className="flex items-center gap-3 px-1">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand text-content-on-brand text-[10px] font-black">2</span>
                            <h2 className="text-sm font-bold text-content uppercase tracking-[0.2em]">{t('geneticTripPage.tripConfig')}</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-1">
                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] px-2">{t("searchFlight.geneticTrip.startDateLabel")}</label>
                                <Calendar
                                    isOpen={isStartDateOpen}
                                    setIsOpen={setIsStartDateOpen}
                                    value={startDate}
                                    minDate={today}
                                    onChange={(date) => {
                                        setStartDate(date);
                                        setIsStartDateOpen(false);
                                    }}
                                    trigger={
                                        <div
                                            onClick={() => setIsStartDateOpen(true)}
                                            className="flex items-center justify-between bg-surface/40 border border-line rounded-3xl px-6 py-5 transition-all cursor-pointer group hover:bg-main hover:border-brand/40 shadow-sm hover:shadow-md"
                                        >
                                            <div className="flex items-center gap-4">
                                                <CalendarIcon className="text-brand/60 group-hover:text-brand transition-colors" size={22} />
                                                <span className={`text-lg font-bold ${startDate ? 'text-content' : 'text-content-muted/40'}`}>
                                                    {startDate || t("searchFlight.geneticTrip.startDatePlaceholder")}
                                                </span>
                                            </div>
                                            <ArrowRight size={18} className="text-content-muted/20 group-hover:text-brand transition-colors opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0" />
                                        </div>
                                    }
                                />
                            </div>
                            
                            <div className="flex flex-col gap-4">
                                <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] px-2">{t("searchFlight.geneticTrip.daysPerCityLabel")}</label>
                                <div className="flex items-center justify-between bg-surface/40 border border-line rounded-3xl px-6 py-5 transition-all group hover:bg-main hover:border-brand/40 shadow-sm hover:shadow-md">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="p-1.5 bg-brand/10 rounded-xl">
                                            <Plus className="text-brand" size={18} />
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={daysPerCity}
                                            onChange={(e) => setDaysPerCity(parseInt(e.target.value) || 1)}
                                            className="bg-transparent border-none p-0 text-content focus:outline-none w-full font-bold text-lg"
                                        />
                                    </div>
                                    <span className="text-xs font-black text-brand/40 uppercase tracking-widest hidden sm:inline">{t('geneticTripPage.daysPerCity')}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Step 3: Global Submit View (Large screens) */}
                    <section className="hidden lg:flex flex-col gap-6 mt-6">
                        <button
                            onClick={handleFormSubmit}
                            disabled={isPending || !origin || cities.length === 0 || !startDate}
                            className="relative overflow-hidden w-full bg-brand hover:bg-brand-hover text-content-on-brand py-8 rounded-[2.5rem] font-black text-2xl shadow-[0_25px_50px_-12px_rgba(var(--brand-rgb),0.5)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed cursor-pointer group"
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                            <div className="flex items-center justify-center gap-4 relative z-10">
                                {isPending ? (
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>{t('geneticTripPage.processing')}</span>
                                    </div>
                                ) : (
                                    <>
                                        <Zap size={28} fill="currentColor" className="group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                                        <span>{t("searchFlight.geneticTrip.optimizeButton")}</span>
                                        <ArrowRight size={28} className="ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300" />
                                    </>
                                )}
                            </div>
                        </button>
                        <div className="flex items-center justify-center gap-3 text-content-muted/40 font-bold italic text-sm">
                            <div className="h-px bg-line/20 flex-1" />
                            <span className="uppercase tracking-[0.3em] text-[10px]">{t("searchFlight.geneticTrip.algorithmDesc")}</span>
                            <div className="h-px bg-line/20 flex-1" />
                        </div>
                    </section>
                </div>

                {/* Right Side: Cities List (4 columns) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="premium-glass p-8 rounded-[2.5rem] border border-line/30 flex flex-col gap-8 h-full min-h-[500px] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-line pb-4">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-xl font-black text-content italic uppercase tracking-tighter">{t('geneticTripPage.itinerary')}</h2>
                                <span className="text-[10px] font-bold text-content-muted uppercase tracking-[0.2em]">{t("searchFlight.geneticTrip.visitCitiesLabel")}</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-black text-lg">
                                {cities.length}
                            </div>
                        </div>

                        {/* List Area */}
                        <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
                            {cities.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-10 bg-surface/20 rounded-[2rem] border-2 border-dashed border-line/50 text-center opacity-60">
                                    <div className="w-16 h-16 rounded-full bg-main flex items-center justify-center text-content-muted mb-6">
                                        <Plus size={32} />
                                    </div>
                                    <p className="text-sm font-bold text-content-muted max-w-[180px] leading-relaxed italic">{t("searchFlight.geneticTrip.addCityPlaceholder")}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {cities.map((city, index) => (
                                        <div key={city.iata_code} className="group relative flex items-center justify-between bg-main/50 border border-line rounded-2xl p-4 hover:border-brand/40 hover:bg-main transition-all animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="flex items-center gap-4 overflow-hidden">
                                                <div className="flex flex-col items-center gap-1 shrink-0">
                                                    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-brand font-black text-xs">
                                                        {index + 1}
                                                    </div>
                                                    {index < cities.length - 1 && <div className="w-0.5 h-4 bg-line/40 rounded-full" />}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-base font-black text-content tracking-tight">{city.iata_code}</span>
                                                    <span className="text-[10px] font-bold text-content-muted uppercase tracking-wider truncate opacity-70">{city.name}</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveCity(index)} 
                                                className="p-2.5 bg-surface border border-line rounded-xl text-content-muted hover:text-red-500 hover:bg-red-500/5 hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add Input View */}
                        <div className="pt-6 border-t border-line">
                            <div className="group relative flex items-center gap-4 bg-brand/5 border-2 border-brand/20 border-dashed rounded-2xl px-5 py-5 transition-all hover:bg-brand/10 focus-within:bg-main focus-within:border-brand focus-within:border-solid shadow-sm">
                                <Plus className="text-brand shrink-0 group-hover:rotate-90 transition-transform duration-300" size={24} />
                                <AirportAutocomplete
                                    value={[]}
                                    onChange={(airports) => {
                                        const airport = airports[airports.length - 1] || null;
                                        if (airport) handleAddCity(airport);
                                        else setNewCity(null);
                                    }}
                                    otherSelected={origin ? [origin, ...cities] : cities}
                                    placeholder={t("searchFlight.geneticTrip.addCityPlaceholder")}
                                    className="bg-transparent border-none p-0 text-content placeholder:text-brand/30 focus:outline-none w-full font-bold text-lg"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit for Mobile */}
                    <div className="lg:hidden flex flex-col gap-4 mt-4">
                        <button
                            onClick={handleFormSubmit}
                            disabled={isPending || !origin || cities.length === 0 || !startDate}
                            className="w-full bg-brand hover:bg-brand-hover text-content-on-brand py-6 rounded-3xl font-black text-xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                        >
                            {isPending ? (
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Zap size={22} fill="currentColor" />
                                    <span>{t("searchFlight.geneticTrip.optimizeButton")}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
