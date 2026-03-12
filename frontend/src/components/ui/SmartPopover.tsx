import React, { useState, useEffect, useLayoutEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface SmartPopoverProps {
    trigger: ReactNode;
    children: ReactNode;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    className?: string;
    contentClassName?: string;
    maxContentWidth?: number;
    minContentHeight?: number;
    maxContentHeight?: number;
    offset?: number;
    preferredAlign?: 'left' | 'right' | 'center';
    entryAnimation?: string;
    exitAnimation?: string;
}

interface PositionState {
    top: number | 'auto';
    bottom: number | 'auto';
    left: number | string;
    right: number | 'auto';
    transform: string;
    maxWidth: number;
    maxHeight: number;
    triggerWidth: number;
    side: 'top' | 'bottom';
    horizontalMode: 'left' | 'right' | 'center';
}

/**
 * A highly intelligent popover component using Portals to avoid CSS nesting issues.
 * Tracks the trigger element precisely across scroll and resize.
 */
export default function SmartPopover({
    trigger,
    children,
    isOpen,
    setIsOpen,
    className = "",
    contentClassName = "",
    maxContentWidth = 420,
    minContentHeight = 160,
    maxContentHeight = 450,
    offset = 8,
    preferredAlign = 'left',
    entryAnimation,
    exitAnimation
}: SmartPopoverProps) {
    const [pos, setPos] = useState<PositionState | null>(null);
    const [shouldRender, setShouldRender] = useState(isOpen);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Sync rendering state with isOpen to allow exit animations
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
        } else {
            // Match this duration with your exit animation (e.g. animate-duration-300)
            const timer = setTimeout(() => setRenderedPos(false), 300);
            function setRenderedPos(val: boolean) {
                setShouldRender(val);
                if (!val) setPos(null); // Clear position only after unmounting
            }
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const updatePosition = () => {
        // Allow updates if it's open OR in the middle of an exit transition
        if ((!isOpen && !shouldRender) || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const vHeight = window.innerHeight;
        const vWidth = window.innerWidth;
        const margin = 16;

        // 1. Vertical Logic (Choose side with more space)
        const spaceBelow = vHeight - rect.bottom - margin;
        const spaceAbove = rect.top - margin;

        // Default to bottom, but flip to top if it doesn't fit below AND there's more space above
        let side: 'top' | 'bottom' = 'bottom';
        if (spaceBelow < maxContentHeight && spaceAbove > spaceBelow) {
            side = 'top';
        }

        const availableVerticalSpace = side === 'bottom' ? spaceBelow : spaceAbove;
        const finalMaxHeight = Math.max(minContentHeight, Math.min(availableVerticalSpace - offset, maxContentHeight));

        // 2. Horizontal Logic
        const canAlignLeft = rect.left + maxContentWidth < vWidth - margin;
        const canAlignRight = rect.right - maxContentWidth > margin;

        let left: number | string = 'auto';
        let right: number | 'auto' = 'auto';
        let transform = 'none';
        let horizontalMode: 'left' | 'right' | 'center' = 'center';

        if (preferredAlign === 'left') {
            if (canAlignLeft) horizontalMode = 'left';
            else if (canAlignRight) horizontalMode = 'right';
        } else if (preferredAlign === 'right') {
            if (canAlignRight) horizontalMode = 'right';
            else if (canAlignLeft) horizontalMode = 'left';
        }

        if (horizontalMode === 'left') {
            left = rect.left;
        } else if (horizontalMode === 'right') {
            right = vWidth - rect.right;
        } else {
            left = '50%';
            transform = 'translateX(-50%)';
        }

        setPos({
            top: side === 'bottom' ? rect.bottom + offset : 'auto',
            bottom: side === 'top' ? (vHeight - rect.top) + offset : 'auto',
            left,
            right,
            transform,
            maxWidth: Math.min(vWidth - (margin * 2), maxContentWidth),
            maxHeight: finalMaxHeight,
            triggerWidth: rect.width,
            side,
            horizontalMode
        });
    };

    // Use useLayoutEffect for immediate positioning before paint
    useLayoutEffect(() => {
        if (isOpen) {
            updatePosition();
        }
    }, [isOpen, maxContentWidth, minContentHeight, maxContentHeight, offset, preferredAlign]);

    // Handle scroll and resize
    useEffect(() => {
        if (!isOpen) return;

        const handleUpdate = () => {
            requestAnimationFrame(updatePosition);
        };

        window.addEventListener('resize', handleUpdate);
        window.addEventListener('scroll', handleUpdate, true);

        return () => {
            window.removeEventListener('resize', handleUpdate);
            window.removeEventListener('scroll', handleUpdate, true);
        };
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (
                containerRef.current && !containerRef.current.contains(target) &&
                contentRef.current && !contentRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        // Use capture phase to ensure we catch the event before any stopPropagation
        document.addEventListener('mousedown', handleClickOutside, true);
        document.addEventListener('touchstart', handleClickOutside, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
            document.removeEventListener('touchstart', handleClickOutside, true);
        };
    }, [isOpen, setIsOpen]);

    return (
        <div className={`relative inline-block ${className}`} ref={containerRef}>
            <div className="w-full h-full">
                {trigger}
            </div>

            {shouldRender && pos && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        bottom: pos.bottom,
                        left: pos.left,
                        right: pos.right,
                        transform: pos.transform,
                        zIndex: 9999,
                        pointerEvents: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: pos.horizontalMode === 'center' ? 'center' : pos.horizontalMode === 'left' ? 'flex-start' : 'flex-end',
                    }}
                >
                    <div
                        ref={contentRef}
                        style={{
                            maxWidth: pos.maxWidth,
                            maxHeight: pos.maxHeight,
                            minWidth: pos.triggerWidth,
                            pointerEvents: isOpen ? 'auto' : 'none', // Disable interactions during exit
                        }}
                        className={`
                            bg-main/60 backdrop-blur-3xl text-content border border-line 
                            rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden text-left 
                            animate-duration-300
                            ${isOpen 
                                ? (entryAnimation || (pos.side === 'top' ? 'animate-fade-in-up' : 'animate-fade-in-down'))
                                : (exitAnimation || (pos.side === 'top' ? 'animate-fade-out-down' : 'animate-fade-out-up'))
                            }
                            [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                            ${contentClassName}
                        `}
                    >
                        {children}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
