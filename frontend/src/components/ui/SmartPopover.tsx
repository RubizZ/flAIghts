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
    keepTriggerWidth?: boolean;
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
    exitAnimation,
    keepTriggerWidth = true
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
        
        // Mobile Keyboard Aware calculations
        const vv = window.visualViewport;
        const viewportHeight = vv ? vv.height : vHeight;
        const viewportOffsetTop = vv ? vv.offsetTop : 0;
        
        const margin = 16;

        // space relative to what's actually visible (keyboard aware)
        const spaceBelowVisible = viewportHeight - (rect.bottom - viewportOffsetTop) - margin;
        const spaceAboveVisible = (rect.top - viewportOffsetTop) - margin;

        // Decide side based on where there is more REAL space
        let side: 'top' | 'bottom' = 'bottom';
        if (spaceBelowVisible < maxContentHeight && spaceAboveVisible > spaceBelowVisible) {
            side = 'top';
        }

        const availableVerticalSpace = side === 'bottom' ? spaceBelowVisible : spaceAboveVisible;
        const finalMaxHeight = Math.max(100, Math.min(availableVerticalSpace - offset, maxContentHeight));

        // 2. Horizontal Logic (Smart threshold centering)
        const paddingLeft = rect.left;
        const paddingRight = vWidth - rect.right;
        const spaceOnRight = vWidth - rect.left; // Space available if aligned left
        const spaceOnLeft = rect.right; // Space available if aligned right

        let horizontalMode: 'left' | 'right' | 'center' = 'center';

        if (preferredAlign === 'left') {
            // "lado pegado" = left. Padding = paddingLeft.
            // "lado no pegado" = right. Tamaño = spaceOnRight.
            const shouldCenter = spaceOnRight < paddingLeft;
            horizontalMode = shouldCenter ? 'center' : 'left';
        } else if (preferredAlign === 'right') {
            // "lado pegado" = right. Padding = paddingRight.
            // "lado no pegado" = left. Tamaño = spaceOnLeft.
            const shouldCenter = spaceOnLeft < paddingRight;
            horizontalMode = shouldCenter ? 'center' : 'right';
        } else {
            horizontalMode = 'center';
        }

        let left: number | string = 'auto';
        let right: number | 'auto' = 'auto';
        let transform = 'none';
        let finalMaxWidth = maxContentWidth;

        if (horizontalMode === 'left') {
            left = rect.left;
            finalMaxWidth = Math.min(maxContentWidth, vWidth - rect.left - margin);
        } else if (horizontalMode === 'right') {
            right = vWidth - rect.right;
            finalMaxWidth = Math.min(maxContentWidth, rect.right - margin);
        } else {
            left = '50%';
            transform = 'translateX(-50%)';
            finalMaxWidth = Math.min(maxContentWidth, vWidth - (margin * 2));
        }

        // Ensure we don't end up with negative or tiny widths
        finalMaxWidth = Math.max(minContentHeight / 2, finalMaxWidth);

        setPos({
            top: side === 'bottom' ? rect.bottom + offset : 'auto',
            bottom: side === 'top' ? (vHeight - rect.top) + offset : 'auto',
            left,
            right,
            transform,
            maxWidth: finalMaxWidth,
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
        
        // Listen to visual viewport changes (keyboard)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleUpdate);
            window.visualViewport.addEventListener('scroll', handleUpdate);
        }

        return () => {
            window.removeEventListener('resize', handleUpdate);
            window.removeEventListener('scroll', handleUpdate, true);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleUpdate);
                window.visualViewport.removeEventListener('scroll', handleUpdate);
            }
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
                        justifyContent: pos.side === 'top' ? 'flex-end' : 'flex-start',
                        alignItems: pos.horizontalMode === 'center' ? 'center' : pos.horizontalMode === 'left' ? 'flex-start' : 'flex-end',
                    }}
                >
                    <div
                        ref={contentRef}
                        style={{
                            maxWidth: pos.maxWidth,
                            maxHeight: pos.maxHeight,
                            minWidth: keepTriggerWidth ? pos.triggerWidth : 'auto',
                            pointerEvents: isOpen ? 'auto' : 'none', // Disable interactions during exit
                        }}
                        className={`
                            bg-main border border-line shadow-2xl text-content 
                            rounded-2xl overflow-y-auto text-left 
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
