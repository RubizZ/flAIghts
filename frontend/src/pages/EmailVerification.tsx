import { useState, useEffect } from "react";
import { toast } from "sonner";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthCard from "@/components/ui/AuthCard";
import FloatingLabelInput from "@/components/ui/FloatingLabelInput";
import { useVerifyEmail, useResendVerificationEmail } from "@/api/generated/users/users";
import { useLogin } from "@/api/generated/auth/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getGetUserQueryKey } from "@/api/generated/users/users";

export default function EmailVerification() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    // Obtenemos email y password del estado de navegación (interno)
    const { email: stateEmail, password: statePassword } = location.state || {};

    // Si no hay email en el estado, redirigimos al login
    useEffect(() => {
        if (!stateEmail) {
            toast.error("Datos de verificación no encontrados");
            navigate("/login");
        }
    }, [stateEmail, navigate]);

    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [resendCountdown, setResendCountdown] = useState(0);

    // Efecto para el contador del botón de reenvío
    useEffect(() => {
        if (resendCountdown > 0) {
            const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCountdown]);

    const { mutate: performLogin } = useLogin({
        mutation: {
            onSuccess: async () => {
                queryClient.invalidateQueries({ queryKey: getGetUserQueryKey() });
                toast.success("¡Email verificado e inicio de sesión automático!");
                navigate("/");
            },
            onError: () => {
                toast.success("¡Email verificado! Por favor, inicia sesión.");
                navigate("/login");
            }
        }
    });

    const { mutate: verify, isPending: isVerifying } = useVerifyEmail({
        mutation: {
            onSuccess: () => {
                if (statePassword) {
                    performLogin({
                        data: {
                            identifier: stateEmail,
                            password: statePassword,
                            responseType: 'cookie'
                        }
                    });
                } else {
                    toast.success("¡Email verificado correctamente!");
                    navigate("/login");
                }
            },
            onError: (err) => {
                if (err.code === "EMAIL_VERIFICATION_CODE_INVALID_OR_EXPIRED") {
                    setError("El código es inválido o ha expirado");
                    toast.error("El código es inválido o ha expirado");
                } else if (err.code === "EMAIL_ALREADY_VERIFIED") {
                    toast.info("Este email ya ha sido verificado");
                    navigate("/login");
                } else if (err.code === "REQUEST_VALIDATION_ERROR") {
                    setError("Por favor, introduce un código válido");
                } else {
                    toast.error(err.message || "Error al verificar el email");
                }
            }
        }
    });

    const { mutate: resend, isPending: isResending } = useResendVerificationEmail({
        mutation: {
            onSuccess: () => {
                toast.success("¡Código reenviado! Revisa tu email.");
                setResendCountdown(60); // Bloquea por 1 minuto
            },
            onError: (err: any) => {
                toast.error(err.message || "Error al reenviar el código");
            }
        }
    });


    const handleVerify = () => {
        if (!token) {
            setError("Introduce el código de verificación");
            return;
        }

        verify({
            data: {
                email: stateEmail,
                code: token
            }
        });
    };

    const enterKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleVerify();
        }
    };

    return (
        <AuthLayout>
            <AuthCard title="Verifica tu cuenta">
                <div className="flex flex-col gap-6">
                    <p className="text-sm text-center text-primary">
                        Te hemos enviado un código de 6 dígitos a <span className="font-bold text-accent">{stateEmail}</span>.
                        Introdúcelo a continuación para activar tu cuenta.
                    </p>

                    <FloatingLabelInput
                        value={token}
                        onChange={(e) => {
                            setToken(e.target.value);
                            if (error) setError("");
                        }}
                        type="text"
                        id="token"
                        name="token"
                        label="Código de verificación"
                        error={error}
                        onKeyDown={enterKeyPress}
                    />

                    <button
                        type="button"
                        onClick={handleVerify}
                        disabled={isVerifying}
                        className="mt-2 rounded-lg bg-accent p-3 text-on-accent font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        {isVerifying ? "Verificando..." : "Verificar Email"}
                    </button>

                    <div className="flex flex-col gap-3">
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => resend({ data: { email: stateEmail } })}
                                disabled={isResending || resendCountdown > 0}
                                className="text-sm font-medium text-secondary hover:underline transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {resendCountdown > 0
                                    ? `Reenviar código de nuevo en ${resendCountdown}s`
                                    : isResending
                                        ? "Enviando..."
                                        : "¿No has recibido el código? Reenviar"
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </AuthCard>
        </AuthLayout>
    );
}

