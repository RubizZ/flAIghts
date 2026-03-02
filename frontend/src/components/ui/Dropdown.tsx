import React, { useState, useRef, useEffect, ReactNode, createContext, useContext } from 'react';

interface DropdownContextType {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    menuStack: string[];
    pushMenu: (menuId: string) => void;
    popMenu: () => void;
    resetMenu: () => void;
}

export const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

export function useDropdown() {
    const context = useContext(DropdownContext);
    if (!context) {
        throw new Error("useDropdown must be used within a Dropdown component");
    }
    return context;
}

interface DropdownProps {
    trigger: ReactNode;
    children?: ReactNode;
    align?: 'left' | 'right';
    className?: string;
    contentClassName?: string;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    entryAnimation?: string;
    exitAnimation?: string;
    menus?: Record<string, ReactNode>;
    initialMenu?: string;
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
    onOpenChange,
    entryAnimation = 'animate-fade-in-down animate-duration-200',
    exitAnimation = 'animate-fade-out-up animate-duration-200',
    menus,
    initialMenu = 'main'
}: DropdownProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [menuStack, setMenuStack] = useState<string[]>([initialMenu]);
    const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward' | 'none'>('none');

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

    const [shouldRender, setShouldRender] = useState(isOpen);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isOpen) {
            setShouldRender(true);
        } else if (shouldRender) {
            // Fallback de seguridad por si onAnimationEnd no se dispara
            timeout = setTimeout(() => {
                setShouldRender(false);
            }, 250);
        }
        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [isOpen, shouldRender]);

    const handleAnimationEnd = () => {
        if (!isOpen) setShouldRender(false);
    };

    const pushMenu = (menuId: string) => {
        setAnimationDirection('forward');
        setMenuStack(prev => [...prev, menuId]);
    };

    const popMenu = () => {
        setAnimationDirection('backward');
        setMenuStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    };

    const resetMenu = () => {
        setAnimationDirection('none');
        setMenuStack([initialMenu]);
    };

    useEffect(() => {
        if (!isOpen) {
            const timeout = setTimeout(() => {
                resetMenu();
            }, 200);
            return () => clearTimeout(timeout);
        }
    }, [isOpen]);

    const contextValue: DropdownContextType = {
        isOpen,
        setIsOpen,
        menuStack,
        pushMenu,
        popMenu,
        resetMenu
    };

    const activeMenuId = menuStack[menuStack.length - 1];
    const activeMenuContent = menus && activeMenuId ? menus[activeMenuId] : null;

    return (
        <DropdownContext.Provider value={contextValue}>
            <div className={`relative inline-block ${className}`} ref={dropdownRef}>
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="cursor-pointer"
                >
                    {trigger}
                </div>

                {shouldRender && (
                    <div
                        onAnimationEnd={handleAnimationEnd}
                        className={`
                            absolute ${align === 'right' ? 'right-0' : 'left-0'} 
                            mt-2 min-w-48 bg-primary border border-themed 
                            rounded-2xl shadow-2xl overflow-hidden 
                            ${isOpen ? entryAnimation : exitAnimation}
                            z-100 ${contentClassName}
                        `}
                    >
                        {menus ? (
                            <div className={`relative overflow-hidden w-full h-full`}>
                                <div key={activeMenuId} className={`${animationDirection === 'forward' ? 'animate-fade-in-left' : animationDirection === 'backward' ? 'animate-fade-in-right' : ''} animate-duration-200 w-full h-full`}>
                                    {activeMenuContent}
                                </div>
                            </div>
                        ) : (
                            children
                        )}
                    </div>
                )}
            </div>
        </DropdownContext.Provider>
    );
}
