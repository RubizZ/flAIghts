import { useTheme } from '@/context/ThemeContext';
import { Turnstile, type TurnstileInstance, type TurnstileProps } from '@marsidev/react-turnstile';
import { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, RefreshCw, ShieldCheck, Lock } from 'lucide-react';

interface TurnstileWidgetProps {
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
    options?: Omit<NonNullable<TurnstileProps['options']>, 'theme'>;
}

export interface TurnstileWidgetRef {
    reset: () => void;
}

const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
    ({ onVerify, onError, onExpire, options }, ref) => {
        const { resolvedTheme } = useTheme();
        const turnstileRef = useRef<TurnstileInstance>(null);
        const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

        const [isActuallyVisible, setIsActuallyVisible] = useState(!!options?.size && options?.size !== 'invisible');
        const [hasError, setHasError] = useState(false);
        const [hasExpired, setHasExpired] = useState(false);
        const [mounted, setMounted] = useState(false);

        useEffect(() => {
            setMounted(true);
        }, []);

        useImperativeHandle(ref, () => ({
            reset: () => {
                setHasError(false);
                setHasExpired(false);
                setIsActuallyVisible(false);
                turnstileRef.current?.reset();
            }
        }));

        if (!siteKey) {
            throw new Error('CRITICAL: VITE_TURNSTILE_SITE_KEY is not defined. Turnstile security is mandatory.');
        }

        const handleError = () => {
            setHasError(true);
            setHasExpired(false);
            onError?.();
        };

        const handleExpire = () => {
            setHasExpired(true);
            setHasError(false);
            onExpire?.();
        };

        const isModalOpen = isActuallyVisible || hasError || hasExpired;

        const modalContent = (
            <div
                className={`fixed inset-0 z-max flex items-center justify-center p-4 ${isModalOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
                style={{ isolation: 'isolate' }}
            >
                {/* Backdrop with enhanced blur */}
                <div
                    className={`absolute inset-0 bg-black/40 backdrop-blur-md transition-all duration-500 ease-out ${isModalOpen ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Modal Container with premium aesthetics */}
                <div className={`relative bg-surface border border-line rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] p-8 w-full max-w-sm flex flex-col items-center gap-8 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${isModalOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'}`}>

                    {/* Security Icon / Brand */}
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-brand/20 blur-2xl rounded-full animate-pulse" />
                            <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-brand/20 to-brand/5 flex items-center justify-center border border-brand/20 rotate-3 hover:rotate-0 transition-transform duration-300">
                                <ShieldCheck className="text-brand size-8" />
                                <Lock className="absolute -bottom-1 -right-1 size-5 text-brand bg-surface rounded-full p-1 border border-brand/20 shadow-sm" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-content tracking-tight">Verificación</h3>
                            <p className="text-sm text-content-muted font-medium px-4">
                                Necesitamos confirmar que eres humano para mantener la plataforma segura.
                            </p>
                        </div>
                    </div>

                    {/* Turnstile Widget Area */}
                    <div className="bg-main/30 rounded-xs p-2 border border-line/50 w-fit mx-auto overflow-hidden min-h-[65px] flex items-center justify-center">
                        <Turnstile
                            ref={turnstileRef}
                            siteKey={siteKey}
                            onSuccess={(token) => {
                                setHasError(false);
                                setHasExpired(false);
                                // Small delay to show the green checkmark for better UX feedback
                                setTimeout(() => {
                                    setIsActuallyVisible(false);
                                    onVerify(token);
                                }, 800);
                            }}
                            onError={handleError}
                            onExpire={handleExpire}
                            onBeforeInteractive={() => setIsActuallyVisible(true)}
                            options={{
                                language: 'es',
                                ...options,
                                theme: resolvedTheme,
                                // Use a stable size to prevent re-mounting the widget.
                                // 'flexible' works well for both background and interactive states.
                                size: options?.size || 'flexible',
                            }}
                        />
                    </div>

                    {/* Error / Expired States */}
                    {(hasError || hasExpired) && (
                        <div className="flex flex-col items-center gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center gap-3 text-red-500 bg-red-500/10 px-4 py-3 rounded-2xl border border-red-500/20 w-full shadow-inner">
                                <AlertCircle size={20} className="shrink-0 animate-bounce" />
                                <p className="text-xs font-bold leading-tight">
                                    {hasError
                                        ? "La verificación ha fallado. Por favor, inténtalo de nuevo."
                                        : "La verificación ha caducado por inactividad."}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setHasError(false);
                                    setHasExpired(false);
                                    turnstileRef.current?.reset();
                                }}
                                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-brand text-content-on-brand font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand/30 cursor-pointer"
                            >
                                <RefreshCw size={18} className="animate-spin-slow" />
                                Reintentar ahora
                            </button>
                        </div>
                    )}


                </div>
            </div>
        );

        return mounted ? createPortal(modalContent, document.body) : null;
    }
);

TurnstileWidget.displayName = 'TurnstileWidget';

export default TurnstileWidget;
