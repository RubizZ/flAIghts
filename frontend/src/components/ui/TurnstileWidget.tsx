import { useTheme } from '@/context/ThemeContext';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef } from 'react';

interface TurnstileWidgetProps {
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
}

export default function TurnstileWidget({ onVerify, onError, onExpire }: TurnstileWidgetProps) {

    const { resolvedTheme } = useTheme();
    const turnstileRef = useRef<TurnstileInstance>(null);
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    if (!siteKey) {
        throw new Error('CRITICAL: VITE_TURNSTILE_SITE_KEY is not defined. Turnstile security is mandatory.');
    }

    return (
        <div className="flex justify-center my-2 animate-fade-in">
            <Turnstile
                ref={turnstileRef}
                siteKey={siteKey}
                onSuccess={onVerify}
                onError={onError}
                onExpire={onExpire}
                options={{
                    theme: resolvedTheme,
                    size: 'flexible',
                    language: 'auto', // TODO localizacion
                }}
            />
        </div>
    );
}
