import React, { useState, useEffect } from "react";
import PlaneBackground from "@/components/ui/PlaneBackground";

interface AuthCardProps {
    children: React.ReactNode;
    title?: React.ReactNode;
}

export default function AuthCard({ children, title }: AuthCardProps) {
    const [hasBack, setHasBack] = useState(false);

    useEffect(() => {
        setHasBack(window.history.length > 1);
    }, []);

    return (
        <div className="relative overflow-hidden animate-fade-in-down bg-linear-to-br from-main to-surface w-full rounded-xl border-3 border-line shadow-2xl opacity-95">
            <PlaneBackground />
            <div className="relative z-10 flex flex-col gap-6 p-8">
                {/* Header */}
                <div className="shrink-0 flex flex-col items-center justify-center relative">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); window.history.back() }}
                        className={hasBack ? "absolute left-0 top-1/2 -translate-y-1/2 text-content-muted/70 hover:text-content transition-colors cursor-pointer" : "hidden"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="size-7">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>

                    <div className="pb-2 font-bold text-3xl tracking-tighter text-content text-center drop-shadow-sm flex flex-col items-center gap-2">
                        {title}
                    </div>
                </div>

                {/* Content */}
                {children}
            </div>
        </div>
    );
}
