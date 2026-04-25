import { useTheme } from '@/context/ThemeContext';
import { Turnstile, type TurnstileInstance, type TurnstileProps } from '@marsidev/react-turnstile';
import { useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface TurnstileWidgetProps {
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
    options?: Omit<NonNullable<TurnstileProps['options']>, 'theme'>;
}

export default function TurnstileWidget({ onVerify, onError, onExpire, options }: TurnstileWidgetProps) {

    const { resolvedTheme } = useTheme();
    const turnstileRef = useRef<TurnstileInstance>(null);
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    // Determine if we should start visible or not. Visible if any size other than 'invisible' is explicitly requested.
    const [isActuallyVisible, setIsActuallyVisible] = useState(!!options?.size && options?.size !== 'invisible');
    const [hasError, setHasError] = useState(false);
    const [hasExpired, setHasExpired] = useState(false);

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

    return (
        <div className={!(isActuallyVisible || hasError || hasExpired) ? "hidden" : "flex flex-col items-center w-full"}>
            <div className={`flex justify-center transition-all duration-300 w-full ${isActuallyVisible ? "my-2 opacity-100" : "h-0 overflow-hidden opacity-0"}`}>
                <Turnstile
                    key={isActuallyVisible ? 'visible' : 'invisible'}
                    ref={turnstileRef}
                    siteKey={siteKey}
                    onSuccess={(token) => {
                        setHasError(false);
                        setHasExpired(false);
                        onVerify(token);
                    }}
                    onError={handleError}
                    onExpire={handleExpire}
                    onBeforeInteractive={() => setIsActuallyVisible(true)}
                    options={{
                        language: 'auto',
                        ...options,
                        theme: resolvedTheme,
                        size: isActuallyVisible ? (options?.size || 'flexible') : 'invisible',
                    }}
                />
            </div>

            {(hasError || hasExpired) && (
                <div className="flex flex-col items-center gap-2 mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-1.5 text-red-500">
                        <AlertCircle size={12} className="shrink-0" />
                        <p className="text-[10px] font-bold leading-tight">
                            {hasError
                                ? "No se ha podido completar la verificación de seguridad"
                                : "La verificación de seguridad ha caducado"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setHasError(false);
                            setHasExpired(false);
                            turnstileRef.current?.reset();
                        }}
                        className="flex items-center gap-1.5 text-[9px] text-brand font-black hover:underline cursor-pointer uppercase tracking-widest bg-brand/5 px-3 py-1.5 rounded-full border border-brand/20 transition-all hover:bg-brand/10 active:scale-95"
                    >
                        <RefreshCw size={10} />
                        Reintentar ahora
                    </button>
                </div>
            )}
        </div>
    );
}
