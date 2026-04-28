import React from "react";
import { MapPin, Search, Plane } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AirportResponse } from "@/api/generated/openapi/model";
import { UnifiedSelection } from "@/types/selection";
import AirportAutocomplete from "../AirportAutocomplete";
import PremiumInput from "../ui/PremiumInput";

interface FlightSearchInputProps {
    type: 'origin' | 'destination';
    value: UnifiedSelection[];
    onChange: (selections: UnifiedSelection[]) => void;
    onMapClick: () => void;
    isMapSelecting?: boolean;
    placeholder?: string;
    className?: string;
    otherSelected?: UnifiedSelection[];
    onHoverChange?: (entity: UnifiedSelection | null) => void;
    disableCities?: boolean;
    maxSelections?: number;
    hideSelections?: boolean;
    label?: string;
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
    disableCities = true,
    maxSelections,
    hideSelections = false,
    label: customLabel,
}) => {
    const { t } = useTranslation();
    const isOrigin = type === 'origin';
    const hasSelection = value.length === 1 && maxSelections === 1;
    const label = customLabel !== undefined ? customLabel : (isOrigin ? t("common.origin") : t("common.destination"));
    
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
            icon={<MapPin size={hasSelection ? 20 : 18} />}
            label={hasSelection ? "" : label}
            iconColorClass={iconColorClass}
            actionButton={!hasSelection ? MapButton : undefined}
            className={className}
        >
            <AirportAutocomplete
                placeholder={placeholder || (isOrigin ? t("airportAutocomplete.fromWhere") : t("airportAutocomplete.toWhere"))}
                className="bg-transparent border-none p-0 text-content placeholder:text-content-muted/60 focus:outline-none w-full text-base lg:text-base font-sans"
                value={value}
                onChange={(newSelections) => {
                    if (maxSelections && newSelections.length > maxSelections) {
                        if (maxSelections === 1) {
                            onChange([newSelections[newSelections.length - 1]!]);
                        } else {
                            onChange(newSelections.slice(-maxSelections));
                        }
                    } else {
                        onChange(newSelections);
                    }
                }}
                otherSelected={otherSelected}
                onHoverChange={onHoverChange}
                disableCities={disableCities}
                maxSelections={maxSelections}
                hideSelections={hideSelections}
            />
        </PremiumInput>
    );
};

export default FlightSearchInput;
