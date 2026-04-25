import { useLoginWeb, useLoginWithGoogleWeb } from "@/api/generated/openapi/auth";
import { GoogleLogin } from '@react-oauth/google';
import { useState, useEffect } from "react";
import { toast } from "sonner";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthCard from "@/components/ui/AuthCard";
import FloatingLabelInput from "@/components/ui/FloatingLabelInput";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/ui/Logo";
import TurnstileWidget from "@/components/ui/TurnstileWidget";

export default function Login() {
    const navigate = useNavigate();
    const { refetch, isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate("/");
        }
    }, [isAuthenticated, isLoading, navigate]);

    const [credentials, setCredentials] = useState({ identifier: "", password: "" });
    const [turnstileToken, setTurnstileToken] = useState<string>("");
    const [errors, setErrors] = useState({ identifier: "", password: "" });

    const { mutate: performLogin, isPending } = useLoginWeb({
        mutation: {
            onSuccess: async () => {
                // El token se guarda en una cookie HttpOnly
                await refetch();
                navigate("/");
            },
            onError: (error) => {
                switch (error.code) {
                    case "REQUEST_VALIDATION_ERROR": {
                        const newErrors = { identifier: "", password: "" };
                        if (error.details["body.identifier"]) {
                            switch (error.details["body.identifier"].message) {
                                case "minLength 3":
                                    newErrors.identifier = "Mínimo 3 caracteres";
                                    break;
                                default:
                                    newErrors.identifier = error.details["body.identifier"].message;
                                    break;
                            }
                        }
                        if (error.details["body.password"]) {
                            switch (error.details["body.password"].message) {
                                case "minLength 8":
                                    newErrors.password = "Mínimo 8 caracteres";
                                    break;
                                default:
                                    newErrors.password = error.details["body.password"].message;
                                    break;
                            }
                        }
                        setErrors(newErrors);
                        break;
                    }
                    case "INVALID_CREDENTIALS":
                        toast.error("Credenciales inválidas");
                        break;
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
                }
            }
        }
    });

    const { mutate: performGoogleLogin, isPending: isGooglePending } = useLoginWithGoogleWeb({
        mutation: {
            onSuccess: async () => {
                await refetch();
                navigate("/");
            },
            onError: () => {
                toast.error("Error al iniciar sesión con Google");
            }
        }
    });

    const login = () => {
        const newErrors = {
            identifier: !credentials.identifier ? "Introduce tu email o nombre de usuario" : "",
            password: !credentials.password ? "Introduce tu contraseña" : credentials.password.length < 8 ? "Mínimo 8 caracteres" : ""
        };
        setErrors(newErrors);

        if (newErrors.identifier || newErrors.password) {
            toast.error("Por favor completa todos los campos");
            return;
        }

        performLogin({
            data: {
                identifier: credentials.identifier,
                password: credentials.password,
                turnstileToken
            }
        });
    }

    const enterKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            login();
        }
    }

    if (isLoading) {
        return (
            <AuthLayout>
                <div className="flex flex-col items-center gap-6 py-12 animate-in fade-in zoom-in duration-500">
                    <div className="relative">
                        <Logo size={64} className="animate-pulse" />
                        <div className="absolute inset-0 bg-brand/20 blur-2xl rounded-full -z-10 animate-pulse" />
                    </div>
                    <div className="flex flex-col items-center gap-3">
                        <span className="text-content-muted font-medium tracking-wide">Verificando sesión...</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-brand animate-bounce animate-delay-[-0.3s]" />
                            <div className="w-2 h-2 rounded-full bg-brand animate-bounce animate-delay-[-0.15s]" />
                            <div className="w-2 h-2 rounded-full bg-brand animate-bounce" />
                        </div>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <AuthCard title={
                <>
                    <Logo size={32} />
                    <span>Inicio de sesión</span>
                </>
            }>
                <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
                    {/* Form Fields */}
                    <FloatingLabelInput
                        value={credentials.identifier}
                        onChange={(e) => {
                            setCredentials({ ...credentials, identifier: e.target.value });
                            if (errors.identifier) setErrors({ ...errors, identifier: "" });
                        }}
                        type="text"
                        id="identifier"
                        name="identifier"
                        label="Email o nombre de usuario"
                        error={errors.identifier}
                        onKeyDown={enterKeyPress}
                    />

                    <FloatingLabelInput
                        value={credentials.password}
                        onChange={(e) => {
                            setCredentials({ ...credentials, password: e.target.value });
                            if (errors.password) setErrors({ ...errors, password: "" });
                        }}
                        type="password"
                        id="password"
                        name="password"
                        label="Contraseña"
                        error={errors.password}
                        onKeyDown={enterKeyPress}
                    />

                    <span className="text-sm text-content text-right">
                        <a href="/forgot-password" className="text-brand hover:underline">¿Olvidaste tu contraseña?</a>
                    </span>

                    <TurnstileWidget 
                        onVerify={setTurnstileToken} 
                        onExpire={() => setTurnstileToken("")}
                        onError={() => setTurnstileToken("")}
                    />

                    <button
                        type="button"
                        onClick={login}
                        disabled={isPending || !turnstileToken || !credentials.identifier || !credentials.password}
                        className={`mt-2 rounded-lg bg-brand p-3 text-content-on-brand font-bold enabled:hover:scale-[1.02] enabled:active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isPending ? "Conectando..." : "Login"}
                    </button>

                    <div className="relative flex py-2 items-center">
                        <div className="grow border-t border-content-muted/30"></div>
                        <span className="shrink-0 mx-4 text-content-muted text-sm">O continúa con</span>
                        <div className="grow border-t border-content-muted/30"></div>
                    </div>

                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={credentialResponse => {
                                if (credentialResponse.credential) {
                                    performGoogleLogin({
                                        data: {
                                            credential: credentialResponse.credential,
                                        }
                                    });
                                }
                            }}
                            onError={() => {
                                toast.error('Error al conectar con Google');
                            }}
                            theme='filled_blue'
                            shape="circle"
                            text="continue_with"
                        />
                    </div>

                    <span className="text-sm text-content text-center">
                        ¿No tienes cuenta? <a href="/register" className="text-brand font-bold hover:underline">Regístrate</a>
                    </span>
                </form>
            </AuthCard>
        </AuthLayout>
    )
}
