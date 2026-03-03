import React, { useState, useEffect } from "react";
import PlaneBackground from "@/components/ui/PlaneBackground";

interface AuthCardProps {
    children: React.ReactNode;
    title?: string;
}

export default function AuthCard({ children, title = "fl/AI\\ghts" }: AuthCardProps) {
    const [hasBack, setHasBack] = useState(false);

    useEffect(() => {
        setHasBack(window.history.length > 1);
    }, []);

    return (
        <div className="relative overflow-hidden animate-fade-in-down bg-linear-to-br from-(--color-bg-primary) to-(--color-bg-secondary) w-full rounded-xl border-3 border-themed shadow-2xl opacity-95">
            <PlaneBackground />
            <div className="relative z-10 flex flex-col gap-6 p-8">
                {/* Header */}
                <div className="shrink-0 flex items-center justify-center relative">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); window.history.back() }}
                        className={hasBack ? "absolute left-0 text-(--color-text-secondary)/70 hover:text-(--color-text-primary) transition-colors cursor-pointer" : "hidden"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="size-7">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>

                    <span className="pb-2 font-bold text-3xl tracking-tighter bg-clip-text text-transparent bg-linear-to-b from-(--color-text-primary) to-(--color-text-primary)/70 drop-shadow-sm">
                        {title}
                    </span>
                </div>

                {/* Content */}
                {children}
            </div>
        </div>
    );
}
