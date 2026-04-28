import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import SmartPopover from './SmartPopover';

interface SelectOption {
    value: string;
    label: string;
    icon?: React.ElementType;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    icon?: React.ElementType;
    className?: string;
    align?: 'left' | 'right' | 'center';
    disabled?: boolean;
}

/**
 * Premium Select component with custom dropdown and glassmorphism effects.
 */
export default function Select({
    value,
    onChange,
    options,
    placeholder = "Seleccionar...",
    icon: Icon,
    className = "",
    align = 'left',
    disabled = false
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    const selectedOption = options.find(opt => opt.value === value);

    return (
        <SmartPopover
            isOpen={isOpen && !disabled}
            setIsOpen={setIsOpen}
            className={className}
            keepTriggerWidth={true}
            preferredAlign={align}
            trigger={
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`
                        w-full flex items-center justify-between gap-3 px-4 py-2.5 
                        bg-surface border border-line rounded-2xl text-sm font-medium
                        transition-all shadow-sm group outline-none
                        ${disabled 
                            ? 'opacity-50 cursor-not-allowed grayscale-[0.5]' 
                            : 'hover:border-brand/40 cursor-pointer focus:ring-2 focus:ring-brand/20'
                        }
                        ${isOpen && !disabled ? 'ring-2 ring-brand/20 border-brand' : ''}
                    `}
                >
                    <div className="flex items-center gap-2.5 truncate">
                        {Icon && <Icon size={16} className={`text-content-muted transition-colors ${!disabled ? 'group-hover:text-brand' : ''}`} />}
                        <span className={selectedOption ? 'text-content' : 'text-content-muted'}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>
                    <ChevronDown 
                        size={16} 
                        className={`text-content-muted transition-transform duration-300 ${isOpen && !disabled ? 'rotate-180 text-brand' : ''}`} 
                    />
                </button>
            }
        >
            <div className="p-2 min-w-[180px]">
                <div className="grid gap-1">
                    {options.map((option) => {
                        const isSelected = option.value === value;
                        const OptionIcon = option.icon;
                        
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`
                                    w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm transition-all cursor-pointer
                                    ${isSelected 
                                        ? 'bg-brand text-content-on-brand font-bold' 
                                        : 'hover:bg-brand/10 text-content-muted hover:text-brand font-medium'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    {OptionIcon && <OptionIcon size={14} className={isSelected ? 'text-content-on-brand' : ''} />}
                                    <span>{option.label}</span>
                                </div>
                                {isSelected && <Check size={14} className="shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </SmartPopover>
    );
}
