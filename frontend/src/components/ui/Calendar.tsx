import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import SmartPopover from "./SmartPopover.tsx";

interface CalendarProps {
    value?: string;
    onChange: (date: string) => void;
    minDate?: string;
    className?: string;
    trigger?: React.ReactNode;
    isOpen?: boolean;
    setIsOpen?: (open: boolean) => void;
    contentClassName?: string;
    defaultMonth?: string;
    keepTriggerWidth?: boolean;
}

export default function Calendar({ value, onChange, minDate, className = "", trigger,    isOpen, 
    setIsOpen, 
    contentClassName, 
    defaultMonth,
    keepTriggerWidth = true
}: CalendarProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const initialDate = useMemo(() => {
        if (value) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) return d;
        }
        if (defaultMonth) {
            const d = new Date(defaultMonth);
            if (!isNaN(d.getTime())) return d;
        }
        return new Date();
    }, [value, defaultMonth]);

    const [viewDate, setViewDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    const [viewMode, setViewMode] = useState<'days' | 'years'>('days');

    // Sync viewDate when defaultMonth or value changes
    useMemo(() => {
        if (value) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
            }
        } else if (defaultMonth) {
            const d = new Date(defaultMonth);
            if (!isNaN(d.getTime())) {
                setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
            }
        }
    }, [value, defaultMonth]);

    const min = useMemo(() => {
        if (minDate) {
            const d = new Date(minDate);
            d.setHours(0, 0, 0, 0);
            return d;
        }
        return null;
    }, [minDate]);

    const daysInMonth = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const date = new Date(year, month, 1);
        const days = [];

        // Adjust Sunday (0) to 6, Monday (1) to 0, etc.
        const firstDayOfWeek = (date.getDay() + 6) % 7;
        const prevMonthLastDate = new Date(year, month, 0).getDate();

        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthLastDate - i),
                currentMonth: false
            });
        }

        const lastDate = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= lastDate; i++) {
            days.push({
                date: new Date(year, month, i),
                currentMonth: true
            });
        }

        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                currentMonth: false
            });
        }

        return days;
    }, [viewDate]);

    const isPrevDisabled = useMemo(() => {
        if (!min) return false;
        const currentMonthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const minMonthStart = new Date(min.getFullYear(), min.getMonth(), 1);
        return currentMonthStart <= minMonthStart;
    }, [viewDate, min]);

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPrevDisabled) return;
        if (viewMode === 'days') {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
        } else {
            setViewDate(new Date(viewDate.getFullYear() - 12, viewDate.getMonth(), 1));
        }
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (viewMode === 'days') {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
        } else {
            setViewDate(new Date(viewDate.getFullYear() + 12, viewDate.getMonth(), 1));
        }
    };

    const isSelected = (date: Date) => {
        if (!value) return false;
        const d = new Date(value);
        if (isNaN(d.getTime())) return false;
        return d.toDateString() === date.toDateString();
    };

    const isToday = (date: Date) => {
        return date.toDateString() === today.toDateString();
    };

    const isDisabled = (date: Date) => {
        if (!min) return false;
        return date < min;
    };

    const monthName = viewDate.toLocaleString('es-ES', { month: 'long' });
    const year = viewDate.getFullYear();

    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    const handleDateSelect = (date: Date) => {
        // Offset adjust to local date ISO
        const dateStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .split('T')[0]!;
        onChange(dateStr);
        if (setIsOpen) setIsOpen(false);
    };

    const calendarContent = (
        <div className={`p-4 bg-main select-none ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-content font-bold capitalize flex items-center gap-2">
                    <CalendarIcon size={16} className="text-brand" />
                    {viewMode === 'days' ? (
                        <>
                            {monthName}
                            <button
                                onClick={(e) => { e.stopPropagation(); setViewMode('years'); }}
                                className="opacity-50 font-normal hover:text-brand transition-colors cursor-pointer px-1 rounded hover:bg-surface"
                            >
                                {year}
                            </button>
                        </>
                    ) : (
                        <span>Seleccionar Año</span>
                    )}
                </h3>
                <div className="flex gap-1">
                    <button
                        onClick={handlePrevMonth}
                        disabled={isPrevDisabled}
                        className={`p-2 rounded-xl transition-all ${isPrevDisabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-surface text-content cursor-pointer'}`}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-surface rounded-xl text-content transition-all cursor-pointer"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {viewMode === 'days' ? (
                <>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDays.map(day => (
                            <div key={day} className="text-[10px] text-center font-bold text-content-muted/50 py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {daysInMonth.map((day, idx) => {
                            const selected = isSelected(day.date);
                            const current = isToday(day.date);
                            const disabled = isDisabled(day.date);
                            const isOutside = !day.currentMonth;

                            return (
                                <button
                                    key={idx}
                                    disabled={disabled}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDateSelect(day.date);
                                    }}
                                    className={`
                                        relative w-full aspect-square flex items-center justify-center rounded-xl text-xs font-medium transition-all
                                        ${disabled ? 'opacity-10 cursor-not-allowed' : 'cursor-pointer hover:bg-surface'}
                                        ${selected ? 'bg-brand! text-content-on-brand! shadow-lg shadow-brand/20 scale-105 z-10' : ''}
                                        ${isOutside && !selected ? 'text-content-muted/30' : 'text-content'}
                                        ${current && !selected ? 'border border-brand/30 text-brand' : ''}
                                    `}
                                >
                                    {day.date.getDate()}
                                    {current && !selected && (
                                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-brand" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 12 }, (_, i) => {
                        const y = viewDate.getFullYear() - 5 + i;
                        const isSelectedYear = y === year;
                        return (
                            <button
                                key={y}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setViewDate(new Date(y, viewDate.getMonth(), 1));
                                    setViewMode('days');
                                }}
                                className={`
                                    py-3 rounded-xl text-xs font-bold transition-all cursor-pointer
                                    ${isSelectedYear ? 'bg-brand text-content-on-brand shadow-lg' : 'hover:bg-surface text-content'}
                                `}
                            >
                                {y}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDateSelect(today);
                    }}
                    className="text-[10px] font-bold uppercase tracking-widest text-brand hover:opacity-80 transition-all cursor-pointer"
                >
                    Hoy
                </button>
                <div className="text-[10px] text-content-muted font-medium">
                    {value && !isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha'}
                </div>
            </div>
        </div>
    );

    if (trigger && isOpen !== undefined && setIsOpen !== undefined) {
        return (
            <SmartPopover
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                trigger={trigger}
                className="w-full"
                contentClassName={contentClassName}
                maxContentHeight={550}
                keepTriggerWidth={keepTriggerWidth}
            >
                {calendarContent}
            </SmartPopover>
        );
    }

    return calendarContent;
}
