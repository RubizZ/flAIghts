import React from "react";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import Calendar from "../ui/Calendar";
import Tooltip from "../ui/Tooltip";
import PremiumInput from "../ui/PremiumInput";

interface DateSearchInputProps {
    type: 'departure' | 'return';
    value: string;
    onChange: (date: string) => void;
    minDate?: string;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    disabled?: boolean;
    disabledTooltip?: string;
    defaultMonth?: string;
    onClear?: () => void;
    className?: string;
}

const DateSearchInput: React.FC<DateSearchInputProps> = ({
    type,
    value,
    onChange,
    minDate,
    isOpen,
    setIsOpen,
    disabled = false,
    disabledTooltip,
    defaultMonth,
    onClear,
    className = "",
}) => {
    const isDeparture = type === 'departure';
    const label = isDeparture ? "Salida" : "Regreso";
    const iconColorClass = value 
        ? (isDeparture ? "text-origin" : "text-destination")
        : "text-content-muted";

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "Seleccionar";
        const date = new Date(dateStr);
        const isCurrentYear = date.getFullYear() === new Date().getFullYear();

        if (isCurrentYear) {
            return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
        } else {
            return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    };

    const trigger = (
        <div className="relative group w-full h-full">
            <PremiumInput
                icon={<CalendarIcon size={16} />}
                label={label}
                iconColorClass={iconColorClass}
                disabled={disabled}
                className="w-full h-full"
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`truncate text-sm lg:text-base font-sans transition-all ${
                    value ? 'text-content' : 'text-content-muted/50 font-normal'
                }`}>
                    {formatDate(value)}
                </span>
            </PremiumInput>
            
            {!disabled && value && onClear && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                    }}
                    className="absolute -right-1 -top-1 bg-main text-content-muted p-1 rounded-full border border-line hover:text-red-500 transition-all shadow-sm z-20 cursor-pointer"
                >
                    <Plus size={10} className="rotate-45" />
                </button>
            )}
        </div>
    );

    return (
        <div className={`relative flex w-full min-w-0 ${className}`}>
            <Tooltip 
                content={disabledTooltip || ""} 
                disabled={!disabled || !disabledTooltip} 
                position="bottom"
            >
                <div className="w-full">
                    <Calendar
                        isOpen={isOpen}
                        setIsOpen={setIsOpen}
                        value={value}
                        onChange={onChange}
                        minDate={minDate}
                        defaultMonth={defaultMonth}
                        trigger={trigger}
                        contentClassName="w-[380px] bg-main/90 backdrop-blur-3xl border border-line shadow-2xl rounded-3xl"
                    />
                </div>
            </Tooltip>
        </div>
    );
};

export default DateSearchInput;
