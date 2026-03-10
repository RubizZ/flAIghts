import { ReactNode, useState } from "react";

interface TooltipProps {
    children: ReactNode;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    disabled?: boolean;
}

export default function Tooltip({ children, content, position = 'top', disabled = false }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    if (disabled) return <>{children}</>;

    const positions = {
        top: "-top-2 left-1/2 -translate-x-1/2 -translate-y-full mb-2",
        bottom: "-bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-2",
        left: "top-1/2 -left-2 -translate-x-full -translate-y-1/2 mr-2",
        right: "top-1/2 -right-2 translate-x-full -translate-y-1/2 ml-2"
    };

    const arrows = {
        top: "bottom-[-4px] left-1/2 -translate-x-1/2 border-t-main/90 border-x-transparent border-b-transparent",
        bottom: "top-[-4px] left-1/2 -translate-x-1/2 border-b-main/90 border-x-transparent border-t-transparent",
        left: "right-[-4px] top-1/2 -translate-y-1/2 border-l-main/90 border-y-transparent border-r-transparent",
        right: "left-[-4px] top-1/2 -translate-y-1/2 border-r-main/90 border-y-transparent border-l-transparent"
    };

    return (
        <div
            className="relative flex h-full w-full"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    className={`absolute z-100 px-3 py-2 bg-main/90 backdrop-blur-3xl border border-line text-content text-xs font-medium rounded-xl shadow-2xl pointer-events-none whitespace-nowrap animate-duration-200 animate-delay-500 ${positions[position]} ${position === 'top' ? 'animate-fade-in-up' :
                        position === 'bottom' ? 'animate-fade-in-down' :
                            position === 'left' ? 'animate-fade-in-left' :
                                'animate-fade-in-right'
                        }`}
                >
                    {content}
                    <div className={`absolute w-0 h-0 border-4 ${arrows[position]}`} />
                </div>
            )}
        </div>
    );
}
