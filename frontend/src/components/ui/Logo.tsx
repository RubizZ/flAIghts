import { useId, useImperativeHandle, useState, forwardRef } from "react";
import { Link } from "react-router-dom";

interface LogoProps {
    className?: string;
    showText?: boolean;
    size?: number;
}

export interface LogoHandle {
    hide: () => void;
    show: () => void;
}

const Logo = forwardRef<LogoHandle, LogoProps>(function Logo(
    { className = "", showText = true, size = 20 },
    ref
) {
    const uid = useId();
    const gradId = `logo_grad_${uid.replace(/:/g, "")}`;
    const clipId = `logo_clip_${uid.replace(/:/g, "")}`;
    const [isHidden, setIsHidden] = useState(false);

    useImperativeHandle(ref, () => ({
        hide: () => setIsHidden(true),
        show: () => setIsHidden(false),
    }));

    return (
        // Wrapper handles the off-screen slide — no hover transforms here
        <div
            style={{
                transform: isHidden ? 'translateY(-120px)' : 'translateY(0px)',
                opacity: isHidden ? 0 : 1,
                pointerEvents: isHidden ? 'none' : 'auto',
                transition: isHidden
                    ? 'transform 350ms cubic-bezier(0.4, 0, 1, 1), opacity 280ms cubic-bezier(0.4, 0, 1, 1)'
                    : 'transform 600ms cubic-bezier(0, 0, 0.2, 1), opacity 500ms cubic-bezier(0, 0, 0.2, 1)',
            }}
        >
            {/* Link handles hover/active effects independently */}
            <Link
                to="/"
                className={`flex items-center gap-2.5 group transition-transform duration-300 hover:scale-105 active:scale-95 pointer-events-auto ${className}`}
            >
                <div className="relative flex items-center justify-center">
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-brand/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

                    <svg width={size + 8} height={size + 8} viewBox="5 6.5 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id={gradId} x1="6" y1="8" x2="24" y2="25" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#3b82f6" />
                                <stop offset="1" stopColor="#8b5cf6" />
                            </linearGradient>
                            <clipPath id={clipId}>
                                <path d="M24 8L6 15L13 18L16 25L24 8Z" />
                            </clipPath>
                        </defs>
                        <path d="M24 8L6 15L13 18L16 25L24 8Z" fill={`url(#${gradId})`} />
                        <path d="M24 8L13 18" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" clipPath={`url(#${clipId})`} />
                    </svg>
                </div>

                {showText && (
                    <span className="font-black tracking-tighter text-2xl text-content">
                        fl<span className="text-brand">AI</span>ghts
                    </span>
                )}
            </Link>
        </div>
    );
});

export default Logo;
