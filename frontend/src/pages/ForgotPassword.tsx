import { useForgotPassword } from "@/api/generated/openapi/auth";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthCard from "@/components/ui/AuthCard";
import FloatingLabelInput from "@/components/ui/FloatingLabelInput";
import { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import Logo from "@/components/ui/Logo";
import TurnstileWidget from "@/components/ui/TurnstileWidget";

export default function ForgotPassword(): JSX.Element {
    const [email, setEmail] = useState('');
    const [turnstileToken, setTurnstileToken] = useState<string>('');
    const [error, setError] = useState('');

    const { mutate: forgotPassword, isPending } = useForgotPassword({
        mutation: {
            onSuccess: () => {
                toast.success('Se ha enviado un correo con un enlace para restablecer tu contraseña');
            },
            onError: (error) => {
                switch (error.code) {
                    case "REQUEST_VALIDATION_ERROR": {
                        toast.error(error.message);
                        if (error.details["body.email"]) {
                            setError(error.details["body.email"].message);
                        }
                        break;
                    }
                    case "TURNSTILE_MISSING_TOKEN":
                        toast.error("Por favor, completa la verificación de seguridad.");
                        break;
                    case "TURNSTILE_INVALID_TOKEN":
                        toast.error("El token de seguridad no es válido. Inténtalo de nuevo.");
                        break;
                    case "TURNSTILE_TOKEN_ALREADY_SPENT":
                        toast.error("La verificación ha expirado o ya ha sido usada. Por favor, recarga el widget.");
                        break;
                    case "TURNSTILE_VERIFICATION_FAILED":
                        toast.error("La verificación de seguridad ha fallado. Por favor, inténtalo de nuevo.");
                        break;
                    default: {
                        toast.error('Error desconocido al enviar el correo');
                        break;
                    }
                }
            }
        }
    })

    const handleSubmit = () => {
        if (!email) {
            setError('El email es obligatorio');
            return;
        }

        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            setError('El email es invalido');
            return;
        }

        forgotPassword({ data: { email, turnstileToken } });
    }

    return (
        <AuthLayout>
            <AuthCard title={
                <>
                    <Logo size={32} />
                    <span>Recuperar contraseña</span>
                </>
            }>
                <form action="" className="flex flex-col gap-4">
                    <p className="text-center text-content-muted text-sm text-muted-foreground">
                        Escribe tu email y te enviaremos un enlace para restablecer tu contraseña.
                    </p>
                    <FloatingLabelInput
                        label="Email"
                        type="email"
                        name="email"
                        required
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError('');
                        }}
                        error={error}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                    />
                    <TurnstileWidget 
                        onVerify={setTurnstileToken} 
                        onExpire={() => setTurnstileToken("")}
                        onError={() => setTurnstileToken("")}
                    />
                    <button disabled={isPending || !turnstileToken} onClick={handleSubmit} type="button" className="mt-2 rounded-lg bg-brand p-3 text-content-on-brand font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
                        {isPending ? 'Enviando...' : 'Enviar'}
                    </button>
                </form>
            </AuthCard>
        </AuthLayout>
    )
}