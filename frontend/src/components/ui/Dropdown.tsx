import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface DropdownProps {
    trigger: ReactNode;
    children: ReactNode;
    align?: 'left' | 'right';
    className?: string;
    contentClassName?: string;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

/**
 * Componente de menú desplegable reutilizable y premium.
 * Incluye lógica de cierre al hacer clic fuera y animaciones integradas.
 */
export default function Dropdown({
    trigger,
    children,
    align = 'right',
    className = '',
    contentClassName = '',
    isOpen: externalIsOpen,
    onOpenChange
}: DropdownProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Priorizar el estado controlado si se proporciona
    const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
    const setIsOpen = (value: boolean) => {
        if (onOpenChange) {
            onOpenChange(value);
        } else {
            setInternalIsOpen(value);
        }
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <div className={`relative inline-block ${className}`} ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="cursor-pointer"
            >
                {trigger}
            </div>

            {isOpen && (
                <div
                    className={`
                        absolute ${align === 'right' ? 'right-0' : 'left-0'} 
                        mt-2 w-48 bg-primary border border-themed 
                        rounded-2xl shadow-2xl overflow-hidden 
                        animate-in fade-in slide-in-from-top-2 duration-200 
                        z-[100] ${contentClassName}
                    `}
                >
                    {children}
                </div>
            )}
        </div>
    );
}
