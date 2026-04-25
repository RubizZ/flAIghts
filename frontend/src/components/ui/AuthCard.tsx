import React, { useState, useEffect } from "react";
import PlaneBackground from "@/components/ui/PlaneBackground";

interface AuthCardProps {
    children: React.ReactNode;
    title?: React.ReactNode;
}

export default function AuthCard({ children, title }: AuthCardProps) {

    return (
        <div className="relative overflow-hidden bg-linear-to-br from-main to-surface w-full rounded-xl border-3 border-line shadow-2xl opacity-95">
            <PlaneBackground />
            <div className="relative z-10 flex flex-col gap-6 p-8">
                {/* Header */}
                <div className="shrink-0 flex flex-col items-center justify-center relative">

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
