import React from "react";

interface PremiumInputProps {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
    iconColorClass?: string;
    actionButton?: React.ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    error?: string;
}

const PremiumInput: React.FC<PremiumInputProps> = ({
    icon,
    label,
    children,
    iconColorClass = "text-content-muted",
    actionButton,
    className = "",
    onClick,
    disabled = false,
    error,
}) => {
    return (
        <div
            onClick={!disabled ? onClick : undefined}
            className={`premium-input group flex items-center gap-1.5 lg:gap-2 rounded-2xl px-2.5 lg:px-3.5 py-1.5 lg:py-2 transition-all ${disabled ? "opacity-50 cursor-not-allowed grayscale" : onClick ? "cursor-pointer" : ""
                } ${error ? "border-red-500/50" : ""} ${className}`}
        >
            <div className={`shrink-0 transition-colors ${iconColorClass}`}>
                {icon}
            </div>

            <div className="flex flex-col grow min-w-0 text-left justify-center">
                {label && (
                    <span className="text-[9px] text-content-muted uppercase font-bold tracking-wider empty:h-0">
                        {label}
                    </span>
                )}
                <div className="relative flex items-center min-h-[1.75rem] lg:min-h-[2rem] min-w-0">
                    {children}
                </div>
                {error && (
                    <span className="text-[8px] text-red-500 font-medium absolute -bottom-4 left-0">
                        {error}
                    </span>
                )}
            </div>

            {actionButton && (
                <div className="shrink-0">
                    {actionButton}
                </div>
            )}
        </div>
    );
};

export default PremiumInput;
