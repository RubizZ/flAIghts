import React, { useEffect, useState, useRef } from 'react';
import { WifiOff, CloudOff, Loader2 } from 'lucide-react';
import { gsap } from 'gsap';

const ConnectionOverlay: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isServerUp, setIsServerUp] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        const handleServerDown = () => setIsServerUp(false);
        const handleServerUp = () => setIsServerUp(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('server-down', handleServerDown);
        window.addEventListener('server-up', handleServerUp);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('server-down', handleServerDown);
            window.removeEventListener('server-up', handleServerUp);
        };
    }, []);

    const showOverlay = !isOnline || !isServerUp;

    useEffect(() => {
        if (showOverlay) {
            setIsVisible(true);
            gsap.to(overlayRef.current, {
                opacity: 1,
                duration: 0.4,
                ease: "power2.out"
            });
            gsap.fromTo(contentRef.current,
                { scale: 0.9, opacity: 0, y: 20 },
                { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.7)", delay: 0.1 }
            );
        } else if (isVisible) {
            gsap.to(overlayRef.current, {
                opacity: 0,
                duration: 0.3,
                ease: "power2.in",
                onComplete: () => setIsVisible(false)
            });
        }
    }, [showOverlay, isVisible]);

    if (!isVisible) return null;

    const showNoInternet = !isOnline;
    const errorTitle = showNoInternet ? "Sin conexión de red" : "Torre de control fuera de servicio";
    const errorDescription = showNoInternet
        ? "Parece que no tienes conexión a internet. Comprueba los datos o el Wi-Fi de tu dispositivo."
        : "Tu internet funciona, pero nuestro servidor no responde. Estamos intentando reconectar automáticamente.";

    const Icon = showNoInternet ? WifiOff : CloudOff;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-9999 flex items-center justify-center bg-main/20 backdrop-blur-[2px] px-6 pointer-events-auto"
            style={{ opacity: 0 }}
        >
            <div
                ref={contentRef}
                className="bg-surface/90 backdrop-blur-md border border-line p-8 rounded-4xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-w-sm w-full text-center space-y-6"
            >
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
                    <div className="relative bg-surface p-5 rounded-full border border-blue-500/20 shadow-xl">
                        <Icon size={40} className="text-blue-500" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-xl font-bold text-content tracking-tight">
                        {errorTitle}
                    </h3>
                    <p className="text-sm text-content-muted leading-relaxed">
                        {errorDescription}
                    </p>
                </div>

                <div className="flex flex-col items-center gap-4 pt-2">
                    <div className="flex items-center justify-center gap-3 px-5 py-2.5 bg-blue-500/10 text-blue-500 rounded-full font-semibold text-sm border border-blue-500/10">
                        <Loader2 size={16} className="animate-spin" />
                        <span>{showNoInternet ? "Esperando conexión..." : "Reintentando..."}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConnectionOverlay;
