import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface NavIconButtonProps {
    children: ReactNode;
    to?: string;
    onClick?: () => void;
    title?: string;
    className?: string;
    variant?: 'floating' | 'flat';
    showBadge?: boolean;
}

const NavIconButton: React.FC<NavIconButtonProps> = ({
    children,
    to,
    onClick,
    title,
    className = '',
    variant = 'floating',
    showBadge = false
}) => {
    const isFloating = variant === 'floating';

    const baseStyles = "relative flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer group focus:outline-none";
    
    // Strict symmetry & HUD synchronization:
    // Mobile/Tablet: 40x40 Circle (w-10 h-10 rounded-full)
    // Desktop (>=1024px): Premium Capsule (lg:h-10 lg:p-1.5 lg:px-4)
    const sizeStyles = "w-10 h-10 lg:w-auto lg:h-10 lg:p-1.5 lg:px-4 lg:gap-2";
    const shapeStyles = "rounded-full";
    
    const glassStyles = isFloating 
        ? "premium-glass" 
        : "bg-main/40 hover:bg-main/60 dark:bg-surface dark:hover:bg-surface/80 border border-line";

    const content = (
        <>
            {children}
            {showBadge && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full animate-in fade-in scale-in duration-300" />
            )}
        </>
    );

    if (to) {
        return (
            <Link
                to={to}
                title={title}
                className={`${baseStyles} ${sizeStyles} ${shapeStyles} ${glassStyles} ${className} animate-in fade-in zoom-in duration-700 cubic-bezier(0.4, 0, 0.2, 1)`}
            >
                {content}
            </Link>
        );
    }

    return (
        <button
            onClick={onClick}
            title={title}
            className={`${baseStyles} ${sizeStyles} ${shapeStyles} ${glassStyles} ${className} animate-in fade-in zoom-in duration-700 cubic-bezier(0.4, 0, 0.2, 1)`}
        >
            {content}
        </button>
    );
};

export default NavIconButton;
