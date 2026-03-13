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
    isPill?: boolean;
}

const NavIconButton: React.FC<NavIconButtonProps> = ({
    children,
    to,
    onClick,
    title,
    className = '',
    variant = 'floating',
    isPill = false,
    showBadge = false
}) => {
    const isFloating = variant === 'floating';

    const baseStyles = "relative flex items-center justify-center transition-all duration-100 cursor-pointer group focus:outline-none";

    // Strict symmetry & HUD synchronization:
    // Icons: Strictly 48x48 Circle
    // Pills: 48px height with horizontal padding
    const sizeStyles = isPill ? "h-12 px-6 min-w-fit" : "w-12 h-12";
    const shapeStyles = "rounded-full";

    const glassStyles = isFloating
        ? "premium-glass"
        : "bg-surface hover:bg-surface/80 border border-line";

    const hoverStyles = "hover:scale-105 active:scale-95";

    const content = (
        <>
            {children}
            {showBadge && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full animate-in fade-in scale-in duration-300 shadow-[0_0_8px_rgba(var(--color-brand),0.6)]" />
            )}
        </>
    );

    if (to) {
        return (
            <Link
                to={to}
                title={title}
                className={`${baseStyles} ${sizeStyles} ${shapeStyles} ${glassStyles} ${hoverStyles} ${className} animate-in fade-in zoom-in duration-700 cubic-bezier(0.4, 0, 0.2, 1)`}
            >
                {content}
            </Link>
        );
    }

    return (
        <button
            onClick={onClick}
            title={title}
            className={`${baseStyles} ${sizeStyles} ${shapeStyles} ${glassStyles} ${hoverStyles} ${className} animate-in fade-in zoom-in duration-700 cubic-bezier(0.4, 0, 0.2, 1)`}
        >
            {content}
        </button>
    );
};

export default NavIconButton;
