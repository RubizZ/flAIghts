import React from "react";

interface GlobeLoadingScreenProps {
    isVisible: boolean;
    text: string;
    showDots?: boolean;
    className?: string;
}

export default function GlobeLoadingScreen({
    isVisible,
    text,
    showDots = true,
    className = "absolute inset-0 z-app-loading bg-main",
}: GlobeLoadingScreenProps) {
    return (
        <div
            className={`${className} flex flex-col items-center justify-center gap-6 transition-opacity duration-700 ${
                isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
        >
            <div className="relative flex items-center justify-center">
                <div
                    className="absolute w-20 h-20 rounded-full border border-brand/40 animate-radar"
                    style={{ animationDelay: "0s" }}
                />
                <div
                    className="absolute w-20 h-20 rounded-full border border-brand/25 animate-radar"
                    style={{ animationDelay: "0.8s" }}
                />
                <div
                    className="absolute w-20 h-20 rounded-full border border-brand/15 animate-radar"
                    style={{ animationDelay: "1.6s" }}
                />
                <svg
                    className="w-10 h-10 text-brand relative z-10"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1l3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
            </div>
            <div className="flex flex-col items-center gap-1">
                <span className="text-content-muted text-xs font-bold uppercase tracking-widest text-center">
                    {text}
                </span>
            </div>
            {showDots && (
                <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-pulse"
                            style={{ animationDelay: `${i * 200}ms` }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
