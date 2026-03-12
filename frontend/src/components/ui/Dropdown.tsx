import React, { useState, useEffect, ReactNode, createContext, useContext } from 'react';
import SmartPopover from './SmartPopover';

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
    align?: 'left' | 'right' | 'center';
    side?: 'top' | 'bottom';
    className?: string;
    contentClassName?: string;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    entryAnimation?: string;
    exitAnimation?: string;
    menus?: Record<string, ReactNode>;
    initialMenu?: string;
    disabled?: boolean;
}

/**
 * Reusable and premium dropdown menu component.
 * Uses SmartPopover for intelligent positioning.
 */
export default function Dropdown({
    trigger,
    children,
    align = 'right',
    className = '',
    contentClassName = '',
    isOpen: externalIsOpen,
    onOpenChange,
    entryAnimation,
    exitAnimation,
    menus,
    initialMenu = 'main',
    disabled = false
}: DropdownProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [menuStack, setMenuStack] = useState<string[]>([initialMenu]);
    const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward' | 'none'>('none');

    const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

    const setIsOpen = (value: boolean) => {
        if (disabled) return;
        if (onOpenChange) {
            onOpenChange(value);
        } else {
            setInternalIsOpen(value);
        }
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

    // Reset menu when closed
    useEffect(() => {
        if (!isOpen) {
            const timeout = setTimeout(resetMenu, 200);
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

    const finalEntryAnimation = entryAnimation || 'animate-fade-in-down animate-duration-200';
    const finalExitAnimation = exitAnimation || 'animate-fade-out-up animate-duration-300';

    const activeMenuId = menuStack[menuStack.length - 1];
    const activeMenuContent = menus && activeMenuId ? menus[activeMenuId] : null;

    return (
        <DropdownContext.Provider value={contextValue}>
            <SmartPopover
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                className={className}
                trigger={
                    <div
                        onClick={() => !disabled && setIsOpen(!isOpen)}
                        className={disabled ? "cursor-not-allowed" : "cursor-pointer"}
                    >
                        {trigger}
                    </div>
                }
                preferredAlign={align}
                entryAnimation={finalEntryAnimation}
                exitAnimation={finalExitAnimation}
            >
                <div
                    className={`z-50 ${contentClassName} overflow-y-auto h-full w-full [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
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
            </SmartPopover>
        </DropdownContext.Provider>
    );
}
