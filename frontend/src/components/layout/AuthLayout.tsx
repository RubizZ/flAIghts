import React from "react";
import backgroundImg from "@assets/login_background.webp";

interface AuthLayoutProps {
    children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="relative min-h-dvh w-screen overflow-hidden">
            {/* Background Layer */}
            <div
                className="absolute inset-0 z-0 h-full w-full bg-[#0a192f] blur-xs brightness-75"
                style={{
                    backgroundImage: `url(${backgroundImg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            />

            {/* Content Layer */}
            <div className="absolute z-10 inset-0 h-full w-full overflow-y-auto overflow-x-hidden flex flex-col items-center justify-center px-6 p-[env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]">
                <div className="w-full max-w-xl flex flex-col gap-4 text-center py-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
