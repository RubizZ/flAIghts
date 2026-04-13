import React from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { AirportResponse } from "@/api/generated/openapi/model";
import FlightSearchInput from "./FlightSearchInput";
import DateSearchInput from "./DateSearchInput";
import { useTranslation } from "react-i18next";

export interface Layover {
    airport: AirportResponse | null;
    date: string;
}

interface ManualSearchFormProps {
    origins: AirportResponse[];
    setOrigins: (airports: AirportResponse[]) => void;
    destinations: AirportResponse[];
    setDestinations: (airports: AirportResponse[]) => void;
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
    startMapSelection: (type: 'origin' | 'destination' | string) => void;
    selectingType: 'origin' | 'destination' | string | null;
    isHorizontal: boolean;
    isMapMode: boolean;
    today: string;
    onHoverChange?: (airport: AirportResponse | null) => void;
}

const ManualSearchForm: React.FC<ManualSearchFormProps> = ({
    origins,
    setOrigins,
    destinations,
    setDestinations,
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
    onHoverChange,
}) => {
    const { t } = useTranslation();

    const handleSwitch = () => {
        const tempOrigins = [...origins];
        setOrigins([...destinations]);
        setDestinations(tempOrigins);
    };

    return (
        <div className={`grow ${isHorizontal ? 'flex flex-row items-stretch gap-4 w-full' : 'flex flex-col gap-3'}`}>
            {/* ── ORIGIN & DESTINATION ── */}
            <div className={`relative flex gap-3 grow ${isHorizontal ? 'flex-3 min-w-0 flex-row items-stretch' : (isMapMode ? 'flex-col sm:flex-row items-stretch sm:items-center' : 'flex-col items-stretch')}`}>
                {/* Origin */}
                <FlightSearchInput
                    type="origin"
                    value={origins}
                    onChange={(newOrigins) => {
                        setOrigins(newOrigins);
                        return true;
                    }}
                    onMapClick={() => startMapSelection('origin')}
                    isMapSelecting={selectingType === 'origin'}
                    className={'flex-1 min-w-0 h-full'}
                    otherSelected={destinations}
                    onHoverChange={onHoverChange}
                />

                {/* Switch Button */}
                <button
                    onClick={handleSwitch}
                    className={`shrink-0 bg-brand text-content-on-brand rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-main z-20 ${isHorizontal
                        ? 'p-1.5 self-center'
                        : isMapMode
                            ? 'absolute right-6 top-[50%] -translate-y-1/2 p-2 px-2.5 border-4 sm:relative sm:right-auto sm:top-auto sm:translate-y-0 sm:p-1.5 sm:self-center sm:border-2'
                            : 'absolute right-6 top-[50%] -translate-y-1/2 p-2 px-2.5 border-4'
                        }`}
                >
                    <ArrowLeftRight size={16} />
                </button>

                {/* Destination */}
                <FlightSearchInput
                    type="destination"
                    value={destinations}
                    onChange={(newDestinations) => {
                        setDestinations(newDestinations);
                        return true;
                    }}
                    onMapClick={() => startMapSelection('destination')}
                    isMapSelecting={selectingType === 'destination'}
                    className={'flex-1 min-w-0 h-full'}
                    otherSelected={origins}
                    onHoverChange={onHoverChange}
                />
            </div>

            {/* ── LAYOVERS ── */}
            {layovers.length > 0 && (
                <div className={`flex ${isHorizontal ? 'flex-col md:flex-row overflow-x-auto pb-2' : 'flex-col overflow-y-auto max-h-[30vh] pr-2'} gap-2 shrink-0`}>
                    {layovers.map((layover, index) => {
                        const layoverPopoverKey = `layover-${mode}-${index}`;
                        return (
                            <div key={index} className={`flex gap-2 animate-fade-in-up items-stretch shrink-0 ${isHorizontal ? 'w-auto' : 'w-full'}`}>
                                {/* Layover airport input */}
                                <FlightSearchInput
                                    type="destination"
                                    value={layover.airport}
                                    onChange={(airport) => onLayoverAirportChange(index, airport)}
                                    onMapClick={() => startMapSelection(`layover-${index}`)}
                                    isMapSelecting={selectingType === `layover-${index}`}
                                    placeholder={t("searchFlight.placeholders.destination")}
                                    className={`flex-[2.5] min-w-0 ${isHorizontal ? 'w-64' : 'w-full'}`}
                                />

                                {/* Layover date */}
                                <div className={`flex-1 min-w-0 ${isHorizontal ? 'w-48' : 'w-full'}`}>
                                    <DateSearchInput
                                        type="departure"
                                        value={layover.date}
                                        onChange={(date) => {
                                            onLayoverDateChange(index, date);
                                            setLayoverPopoverOpen(null);
                                        }}
                                        minDate={index === 0 ? departureDate || today : layovers[index - 1]!.date || departureDate || today}
                                        isOpen={layoverPopoverOpen === layoverPopoverKey}
                                        setIsOpen={(open) => setLayoverPopoverOpen(open ? layoverPopoverKey : null)}
                                    />
                                </div>

                                {/* Remove layover button */}
                                <button
                                    onClick={() => onRemoveLayover(index)}
                                    className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl aspect-square flex items-center justify-center transition-all cursor-pointer border border-red-500/20 shrink-0"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── DATES ── */}
            <div className={`grid gap-2 ${isHorizontal ? 'grid-cols-2 lg:flex-none shrink-0 min-w-48' : 'grid-cols-2 w-full'}`}>
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
                disabled={isPending || origins.length === 0 || destinations.length === 0 || !departureDate}
                className={`group relative flex items-center justify-center gap-2 bg-brand text-content-on-brand rounded-2xl font-bold hover:bg-brand-hover transition-all disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-brand/20 active:scale-95 shrink-0 min-w-fit px-4 lg:px-6 cursor-pointer ${isHorizontal
                    ? 'w-full lg:w-auto py-3.5 lg:py-0'
                    : 'py-4 lg:py-4.5 text-lg w-full'
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
