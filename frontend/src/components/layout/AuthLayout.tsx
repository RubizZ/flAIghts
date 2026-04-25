import React from "react";
import backgroundImg from "@assets/login_background.webp";
import { useNavigate } from "react-router-dom";

interface AuthLayoutProps {
    children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            navigate("/");
        }
    };

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
            <div className="absolute z-10 inset-0 h-full w-full overflow-y-auto overflow-x-hidden flex flex-col items-center px-4 p-[env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]">
                <div className="w-full max-w-xl flex flex-col gap-4 text-center py-4 my-auto animate-fade-in-down">
                    {/* Back Button */}
                    <div className="flex justify-start">
                        <button
                            onClick={handleBack}
                            className="z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-br from-main to-surface border-3 border-line text-content hover:bg-surface transition-all group cursor-pointer shadow-lg opacity-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-5 group-hover:-translate-x-1 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                            <span className="font-medium">Volver</span>
                        </button>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
