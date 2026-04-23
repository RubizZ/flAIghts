import React from "react";
import { MapPin, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AirportResponse } from "@/api/generated/openapi/model";
import AirportAutocomplete from "../AirportAutocomplete";
import PremiumInput from "../ui/PremiumInput";

interface FlightSearchInputProps {
    type: 'origin' | 'destination';
    value: AirportResponse[];
    onChange: (airports: AirportResponse[]) => void;
    onMapClick: () => void;
    isMapSelecting?: boolean;
    placeholder?: string;
    className?: string;
    otherSelected?: AirportResponse[];
    onHoverChange?: (airport: AirportResponse | null) => void;
}

const FlightSearchInput: React.FC<FlightSearchInputProps> = ({
    type,
    value,
    onChange,
    onMapClick,
    isMapSelecting = false,
    placeholder,
    className = "",
    otherSelected = [],
    onHoverChange,
}) => {
    const { t } = useTranslation();
    const isOrigin = type === 'origin';
    const label = isOrigin ? t("common.origin") : t("common.destination");
    const iconColorClass = value.length > 0
        ? (isOrigin ? "text-origin" : "text-destination")
        : "text-content-muted";

    const MapButton = (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onMapClick();
            }}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${isMapSelecting
                ? 'text-brand bg-brand/10'
                : 'text-content-muted hover:bg-surface hover:text-brand'
                }`}
            title={t("home.globe.selectOnMap")}
        >
            <Search size={isOrigin ? 16 : 14} />
        </button>
    );

    return (
        <PremiumInput
            icon={<MapPin size={18} />}
            label={label}
            iconColorClass={iconColorClass}
            actionButton={MapButton}
            className={className}
        >
            <AirportAutocomplete
                placeholder={placeholder || (isOrigin ? t("airportAutocomplete.fromWhere") : t("airportAutocomplete.toWhere"))}
                className="bg-transparent border-none p-0 text-content placeholder:text-content-muted/60 focus:outline-none w-full text-base lg:text-base font-sans"
                value={value}
                onChange={onChange}
                otherSelected={otherSelected}
                onHoverChange={onHoverChange}
            />
        </PremiumInput>
    );
};

export default FlightSearchInput;
