import React from "react";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import Calendar from "../ui/Calendar";
import Tooltip from "../ui/Tooltip";
import PremiumInput from "../ui/PremiumInput";
import { useTranslation } from "react-i18next";

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
    label?: string;
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
    label: customLabel,
}) => {
    const { t } = useTranslation();
    const isDeparture = type === 'departure';
    const defaultLabel = isDeparture ? t("home.globe.departure") : t("home.globe.return");
    const label = customLabel !== undefined ? customLabel : defaultLabel;
    const iconColorClass = value
        ? (isDeparture ? "text-origin" : "text-destination")
        : "text-content-muted";

    const formatDate = (dateStr: string) => {
        if (!dateStr) return t("common.select");
        const date = new Date(dateStr);
        const isCurrentYear = date.getFullYear() === new Date().getFullYear();

        if (isCurrentYear) {
            return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
        } else {
            return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    };

    const containerRef = React.useRef<HTMLDivElement>(null);

    const trigger = (
        <div className="relative group w-full h-full" ref={containerRef}>
            <PremiumInput
                icon={<CalendarIcon size={16} />}
                label={label}
                iconColorClass={iconColorClass}
                disabled={disabled}
                className="w-full h-full"
                onClick={() => {
                    if (!disabled) {
                        const nextState = !isOpen;
                        setIsOpen(nextState);
                        if (nextState) {
                            setTimeout(() => {
                                const vv = window.visualViewport;
                                if (vv && vv.height < window.innerHeight) {
                                    const el = containerRef.current;
                                    const scrollParent = el?.closest('.overflow-y-auto, .custom-scrollbar');
                                    if (el && scrollParent) {
                                        const parentRect = scrollParent.getBoundingClientRect();
                                        const targetRect = el.getBoundingClientRect();
                                        const scrollTop = scrollParent.scrollTop + targetRect.top - parentRect.top - 20;
                                        scrollParent.scrollTo({ top: scrollTop, behavior: 'smooth' });
                                    } else {
                                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }
                            }, 100);
                        }
                    }
                }}
            >
                <span className={`truncate text-base lg:text-base font-sans transition-all ${value ? 'text-content' : 'text-content-muted/50 font-normal'
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
                    className="absolute -right-1.5 -top-1.5 bg-main text-content-muted p-1.5 rounded-full border border-line hover:text-red-500 transition-all shadow-md z-30 cursor-pointer"
                >
                    <Plus size={10} className="rotate-45" />
                </button>
            )}
        </div>
    );

    return (
        <Tooltip
            content={disabledTooltip || ""}
            disabled={!disabled || !disabledTooltip}
            position="bottom"
            className={`w-full ${className}`}
        >
            <Calendar
                className="w-full h-full"
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                value={value}
                onChange={onChange}
                minDate={minDate}
                defaultMonth={defaultMonth}
                trigger={trigger}
                contentClassName="w-[min(380px,90vw,65svh)] bg-main border border-line shadow-2xl rounded-3xl"
                keepTriggerWidth={false}
            />
        </Tooltip>
    );
};

export default DateSearchInput;
