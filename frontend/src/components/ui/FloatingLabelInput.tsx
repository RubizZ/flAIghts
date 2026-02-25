import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: boolean | string;
    isRepeat?: boolean;
}

const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
    ({ label, error, isRepeat = false, className = "", id, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        // Generar un ID si no se proporciona, necesario para el htmlFor del label
        const inputId = id || `floating-input-${label.replace(/\s+/g, '-').toLowerCase()}`;
        const isError = Boolean(error);
        const isPassword = props.type === 'password';
        const currentType = isPassword && !isRepeat && showPassword ? 'text' : props.type;

        return (
            <div className="relative">
                <input
                    ref={ref}
                    id={inputId}
                    {...props}
                    type={currentType}
                    onCopy={isPassword ? (e) => { e.preventDefault(); toast.warning("Por seguridad, no se puede copiar en campos de contraseña", { id: 'copy-warn' }) } : props.onCopy}
                    onCut={isPassword ? (e) => { e.preventDefault(); toast.warning("Por seguridad, no se puede cortar en campos de contraseña", { id: 'cut-warn' }) } : props.onCut}
                    placeholder=" " // Crucial para la detección de :placeholder-shown
                    className={`
                        peer
                        block
                        w-full
                        rounded-lg
                        border
                        bg-primary
                        pl-2.5
                        pb-2.5
                        pt-5
                        pr-10
                        text-sm
                        text-primary
                        outline-none
                        transition-all
                        focus:ring-2
                        focus:ring-opacity-50
                        ${isError
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-themed focus:border-accent focus:ring-accent/20'
                        }
                        ${className}
                    `}
                />
                <label
                    htmlFor={inputId}
                    className={`
                        absolute
                        left-1
                        top-1
                        z-10
                        origin-left
                        translate-y-0
                        scale-75
                        cursor-text
                        px-2
                        text-sm
                        transition-all
                        duration-300
                        ease-in-out
                        peer-placeholder-shown:top-1/2
                        peer-placeholder-shown:-translate-y-1/2
                        peer-placeholder-shown:scale-100
                        peer-focus:top-1
                        peer-focus:translate-y-0
                        peer-focus:scale-75
                        ${isError
                            ? 'text-red-500 peer-focus:text-red-500'
                            : 'text-secondary peer-hover:text-accent peer-focus:text-accent'
                        }
                    `}
                >
                    {label}
                </label>

                {isPassword && !isRepeat && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${showPassword ? 'text-(--color-text-primary)' : 'text-secondary'} hover:text-(--color-bg-accent) focus:outline-none transition-colors cursor-pointer`}
                        tabIndex={-1} // Evita que se enfoque con el tab para no interrumpir el flujo del formulario
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                )}

                {/* Mensaje de error debajo del input */}
                {typeof error === 'string' && error && (
                    <span className="absolute -bottom-4 left-2 text-[10px] font-medium text-red-500 animate-fade-in animate-duration-300">
                        {error}
                    </span>
                )}
            </div>
        );
    }
);

FloatingLabelInput.displayName = 'FloatingLabelInput';

export default FloatingLabelInput;
