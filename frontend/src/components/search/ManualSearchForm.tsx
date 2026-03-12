import React from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import FlightSearchInput from "./FlightSearchInput";
import DateSearchInput from "./DateSearchInput";

interface ManualSearchFormProps {
    origin: string;
    originDisplay: string;
    setOrigin: (val: string, display?: string) => void;
    destination: string;
    destinationDisplay: string;
    setDestination: (val: string, display?: string) => void;
    departureDate: string;
    setDepartureDate: (date: string) => void;
    returnDate: string;
    setReturnDate: (date: string) => void;
    activeDeparturePopover: boolean;
    setActiveDeparturePopover: (open: boolean) => void;
    activeReturnPopover: boolean;
    setActiveReturnPopover: (open: boolean) => void;
    isPending: boolean;
    onSearch: () => void;
    startMapSelection: (type: 'origin' | 'destination') => void;
    selectingType: 'origin' | 'destination' | null;
    isHorizontal: boolean;
    isMapMode: boolean;
    today: string;
}

const ManualSearchForm: React.FC<ManualSearchFormProps> = ({
    origin,
    originDisplay,
    setOrigin,
    destination,
    destinationDisplay,
    setDestination,
    departureDate,
    setDepartureDate,
    returnDate,
    setReturnDate,
    activeDeparturePopover,
    setActiveDeparturePopover,
    activeReturnPopover,
    setActiveReturnPopover,
    isPending,
    onSearch,
    startMapSelection,
    selectingType,
    isHorizontal,
    isMapMode,
    today,
}) => {
    const handleSwitch = () => {
        const tempOrigin = origin;
        const tempOriginDisplay = originDisplay;
        setOrigin(destination, destinationDisplay);
        setDestination(tempOrigin, tempOriginDisplay);
    };

    return (
        <div className={`grow ${isHorizontal ? 'flex flex-row items-stretch gap-4 w-full' : 'flex flex-col gap-3'}`}>
            {/* ── ORIGIN & DESTINATION ── */}
            <div className={`relative flex gap-3 items-center grow ${isMapMode ? 'flex-row w-full' : 'flex-col items-stretch'}`}>
                {/* Origin */}
                <FlightSearchInput
                    type="origin"
                    value={origin}
                    displayValue={originDisplay}
                    onChange={(val, display) => {
                        if (val === destination && val !== "") return false;
                        setOrigin(val, display);
                        return true;
                    }}
                    onMapClick={() => startMapSelection('origin')}
                    isMapSelecting={selectingType === 'origin'}
                    className={isMapMode ? 'flex-1 min-w-0' : 'w-full'}
                />

                {/* Switch Button */}
                <button
                    onClick={handleSwitch}
                    className={`shrink-0 bg-brand text-content-on-brand rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-main z-20 ${
                        isMapMode 
                            ? 'p-1.5 self-center' 
                            : 'absolute right-6 top-[50%] -translate-y-1/2 p-2.5 border-4'
                    }`}
                >
                    <ArrowLeftRight size={16} />
                </button>

                {/* Destination */}
                <FlightSearchInput
                    type="destination"
                    value={destination}
                    displayValue={destinationDisplay}
                    onChange={(val, display) => {
                        if (val === origin && val !== "") return false;
                        setDestination(val, display);
                        return true;
                    }}
                    onMapClick={() => startMapSelection('destination')}
                    isMapSelecting={selectingType === 'destination'}
                    className={isMapMode ? 'flex-1 min-w-0' : 'w-full'}
                />
            </div>

            {/* ── DATES ── */}
            <div className={`grid gap-2 ${isHorizontal ? 'grid-cols-2 lg:w-80 shrink-0' : 'grid-cols-2 w-full'}`}>
                <DateSearchInput
                    type="departure"
                    value={departureDate}
                    onChange={(date) => {
                        setDepartureDate(date);
                        setActiveDeparturePopover(false);
                        if (returnDate && date > returnDate) {
                            setReturnDate("");
                        }
                    }}
                    minDate={today}
                    isOpen={activeDeparturePopover}
                    setIsOpen={setActiveDeparturePopover}
                />

                <DateSearchInput
                    type="return"
                    value={returnDate}
                    onChange={(date) => {
                        setReturnDate(date);
                        setActiveReturnPopover(false);
                    }}
                    minDate={departureDate || today}
                    defaultMonth={departureDate}
                    isOpen={activeReturnPopover}
                    setIsOpen={setActiveReturnPopover}
                    disabled={!departureDate}
                    disabledTooltip="Selecciona primero la fecha de salida"
                    onClear={() => setReturnDate("")}
                />
            </div>

            {/* Search Button */}
            <button
                onClick={onSearch}
                disabled={isPending || !origin || !destination || !departureDate}
                className={`group relative flex items-center justify-center gap-2 bg-brand text-content-on-brand rounded-2xl font-bold hover:bg-brand-hover transition-all disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-brand/20 active:scale-95 shrink min-w-fit px-4 lg:px-6 cursor-pointer ${
                    isHorizontal 
                        ? 'w-full lg:min-w-30 lg:w-auto py-3.5 lg:py-0' 
                        : 'py-4 lg:py-4.5 text-lg'
                }`}
            >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {isPending ? (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Buscando...</span>
                    </div>
                ) : (
                    <>
                        <Search size={18} />
                        <span>{isMapMode ? 'Buscar' : 'Explorar vuelos'}</span>
                    </>
                )}
            </button>
        </div>
    );
};

export default ManualSearchForm;
