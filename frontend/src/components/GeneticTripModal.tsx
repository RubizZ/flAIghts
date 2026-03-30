import { useState } from "react";
import { X, MapPin, Calendar as CalendarIcon, Plus, Trash2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import AirportAutocomplete from "./AirportAutocomplete";
import Calendar from "./ui/Calendar";
import { toast } from "sonner";

interface GeneticTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { origin: string; cities: string[]; startDate: string; daysPerCity: number }) => void;
}

export default function GeneticTripModal({ isOpen, onClose, onSubmit }: GeneticTripModalProps) {
    const { t } = useTranslation();
    const [origin, setOrigin] = useState("");
    const [originDisplay, setOriginDisplay] = useState("");
    const [cities, setCities] = useState<{ iata: string; display: string }[]>([]);
    const [newCity, setNewCity] = useState("");
    const [newCityDisplay, setNewCityDisplay] = useState("");
    const [startDate, setStartDate] = useState("");
    const [isStartDateOpen, setIsStartDateOpen] = useState(false);
    const [daysPerCity, setDaysPerCity] = useState(2);

    const today = new Date().toISOString().split('T')[0];

    if (!isOpen) return null;

    const handleAddCity = (iata: string, display?: string) => {
        if (!iata) return;
        if (iata === origin || cities.some(c => c.iata === iata)) {
            toast.error(t("searchFlight.validation.sameOriginDestination"));
            return false;
        }
        setCities([...cities, { iata, display: display || iata }]);
        setNewCity("");
        setNewCityDisplay("");
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
        onSubmit({
            origin,
            cities: cities.map(c => c.iata),
            startDate,
            daysPerCity
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-main w-full max-w-xl rounded-4xl border border-line shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
                {/* Header */}
                <div className="p-6 border-b border-line flex items-center justify-between bg-surface/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand/10 rounded-xl">
                            <Zap className="text-brand" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-content tracking-tight">{t("searchFlight.geneticTrip.modalTitle")}</h2>
                            <p className="text-content-muted text-sm">{t("searchFlight.geneticTrip.modalSubtitle")}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl transition-colors text-content-muted cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex flex-col gap-6">
                    {/* Origin Section */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-content-muted uppercase tracking-wider px-1">{t("searchFlight.geneticTrip.originLabel")}</label>
                        <div className="group flex items-center gap-3 bg-surface/60 border border-line rounded-2xl px-4 py-3 transition-all focus-within:border-brand/60">
                            <MapPin className="text-brand shrink-0" size={18} />
                            <AirportAutocomplete
                                value={origin}
                                displayValue={originDisplay}
                                onChange={(val, display) => {
                                    if (cities.some(c => c.iata === val)) {
                                        toast.error(t("searchFlight.validation.sameOriginDestination"));
                                        return false;
                                    }
                                    setOrigin(val);
                                    setOriginDisplay(display || val);
                                    return true;
                                }}
                                placeholder={t("searchFlight.geneticTrip.originPlaceholder")}
                                className="bg-transparent border-none p-0 text-content placeholder:text-content-muted/60 focus:outline-none w-full font-medium"
                            />
                        </div>
                    </div>

                    {/* Date and Stay Duration */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-content-muted uppercase tracking-wider px-1">{t("searchFlight.geneticTrip.startDateLabel")}</label>
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
                                        className="flex items-center gap-3 bg-surface/60 border border-line rounded-2xl px-4 py-3.5 transition-all cursor-pointer group"
                                    >
                                        <CalendarIcon className="text-brand shrink-0" size={18} />
                                        <span className={`text-sm font-medium ${startDate ? 'text-content' : 'text-content-muted/60'}`}>
                                            {startDate || t("searchFlight.geneticTrip.startDatePlaceholder")}
                                        </span>
                                    </div>
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-content-muted uppercase tracking-wider px-1">{t("searchFlight.geneticTrip.daysPerCityLabel")}</label>
                            <div className="flex items-center gap-3 bg-surface/60 border border-line rounded-2xl px-4 py-3 transition-all focus-within:border-brand/60">
                                <Plus className="text-brand shrink-0" size={18} />
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={daysPerCity}
                                    onChange={(e) => setDaysPerCity(parseInt(e.target.value) || 1)}
                                    className="bg-transparent border-none p-0 text-content focus:outline-none w-full font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cities List Section */}
                    <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold text-content-muted uppercase tracking-wider px-1">{t("searchFlight.geneticTrip.visitCitiesLabel")} ({cities.length})</label>
                        
                        <div className="flex flex-col gap-2">
                            {cities.map((city, index) => (
                                <div key={city.iata} className="flex items-center justify-between bg-surface/40 border border-line/60 rounded-xl px-4 py-2 animate-fade-in-up">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <MapPin className="text-content-muted shrink-0" size={14} />
                                        <span className="text-sm font-medium truncate">{city.display}</span>
                                    </div>
                                    <button onClick={() => handleRemoveCity(index)} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors cursor-pointer">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="group flex items-center gap-3 bg-brand/5 border border-brand/20 rounded-2xl px-4 py-3 transition-all focus-within:border-brand/60 border-dashed">
                            <Plus className="text-brand shrink-0" size={18} />
                            <AirportAutocomplete
                                value={newCity}
                                displayValue={newCityDisplay}
                                onChange={(val, display) => {
                                    if (val) handleAddCity(val, display);
                                    else {
                                        setNewCity("");
                                        setNewCityDisplay(display || "");
                                    }
                                    return true;
                                }}
                                placeholder={t("searchFlight.geneticTrip.addCityPlaceholder")}
                                className="bg-transparent border-none p-0 text-content placeholder:text-brand/40 focus:outline-none w-full font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-surface/30 border-t border-line">
                    <button
                        onClick={handleFormSubmit}
                        disabled={!origin || cities.length === 0 || !startDate}
                        className="w-full bg-brand hover:bg-brand-hover text-content-on-brand py-4 rounded-2xl font-bold shadow-lg shadow-brand/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Zap size={18} fill="currentColor" />
                        <span>{t("searchFlight.geneticTrip.optimizeButton")}</span>
                    </button>
                    <p className="text-[10px] text-content-muted text-center mt-3 uppercase tracking-tighter">
                        {t("searchFlight.geneticTrip.algorithmDesc")}
                    </p>
                </div>
            </div>
        </div>
    );
}
