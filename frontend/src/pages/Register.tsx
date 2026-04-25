import { useState, useEffect } from "react";
import { toast } from "sonner";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthCard from "@/components/ui/AuthCard";
import FloatingLabelInput from "@/components/ui/FloatingLabelInput";
import { useInitiateRegistration, useCompleteRegistration } from "@/api/generated/openapi/users";
import { useLoginWeb, useLoginWithGoogleWeb } from "@/api/generated/openapi/auth";
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSelfUserQueryKey } from "@/api/generated/openapi/users";
import { useAuth } from "@/context/AuthContext";
import { Mail, ShieldCheck, User as UserIcon, Lock } from "lucide-react";
import Logo from "@/components/ui/Logo";
import TurnstileWidget from "@/components/ui/TurnstileWidget";

export default function Register() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isAuthenticated, isLoading } = useAuth();

    const [step, setStep] = useState<1 | 2>(1);
    const [formData, setFormData] = useState({
        email: "",
        code: "",
        username: "",
        password: "",
        confirmPassword: "",
        acceptedTerms: false,
        turnstileToken: ""
    });
    const [isHoveringLink, setIsHoveringLink] = useState(false);
    const [errors, setErrors] = useState({
        email: "",
        code: "",
        username: "",
        password: "",
        confirmPassword: "",
        acceptedTerms: ""
    });

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate("/");
        }
    }, [isAuthenticated, isLoading, navigate]);

    const { mutate: performLogin } = useLoginWeb({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getGetSelfUserQueryKey() });
                navigate("/");
            },
            onError: () => {
                toast.error("Te has registrado correctamente, pero hubo un error al iniciar sesión. Por favor, identifícate.");
                navigate("/login");
            }
        }
    });

    const { mutate: performGoogleLogin, isPending: isGooglePending } = useLoginWithGoogleWeb({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getGetSelfUserQueryKey() });
                navigate("/");
            },
            onError: () => {
                toast.error("Error al iniciar sesión o registrarse con Google");
            }
        }
    });

    const { mutate: initiateRegistration, isPending: isInitiating } = useInitiateRegistration({
        mutation: {
            onSuccess: () => {
                toast.success("Email de verificación enviado. Revisa tu bandeja de entrada.");
                setStep(2);
            },
            onError: (error) => {
                const newErrors = { ...errors };
                if (error.code === "EMAIL_ALREADY_IN_USE") {
                    newErrors.email = "Este email ya está registrado";
                } else if (error.code === "REQUEST_VALIDATION_ERROR") {
                    if (error.details["body.email"]) newErrors.email = "El email no es válido";
                } else if (error.code === "TURNSTILE_MISSING_TOKEN") {
                    toast.error("Por favor, completa la verificación de seguridad.");
                } else if (error.code === "TURNSTILE_INVALID_TOKEN") {
                    toast.error("El token de seguridad no es válido. Inténtalo de nuevo.");
                } else if (error.code === "TURNSTILE_TOKEN_ALREADY_SPENT") {
                    toast.error("La verificación ha expirado o ya ha sido usada. Por favor, recarga el widget.");
                } else if (error.code === "TURNSTILE_VERIFICATION_FAILED") {
                    toast.error("La verificación de seguridad ha fallado. Por favor, inténtalo de nuevo.");
                }
                setErrors(newErrors);
            }
        }
    });

    const { mutate: completeRegistration, isPending: isCompleting } = useCompleteRegistration({
        mutation: {
            onSuccess: () => {
                performLogin({
                    data: {
                        identifier: formData.email,
                        password: formData.password,
                    }
                });
            },
            onError: (error) => {
                if (error.code === "REQUEST_VALIDATION_ERROR") {
                    error.details
                    const newErrors = { ...errors };
                    if (error.details["body.username"]) {
                        switch (error.details["body.username"].message) {
                            case "minLength 3":
                                newErrors.username = "Mínimo 3 caracteres";
                                break;
                            case "maxLength 20":
                                newErrors.username = "Máximo 20 caracteres";
                                break;
                            default:
                                newErrors.username = error.details["body.username"].message;
                                break;
                        }
                    };
                    if (error.details["body.password"]) {
                        switch (error.details["body.password"].message) {
                            case "minLength 8":
                                newErrors.password = "Mínimo 8 caracteres";
                                break;
                            default:
                                newErrors.password = error.details["body.password"].message;
                                break;
                        }
                    };
                    if (error.details["body.code"]) {
                        switch (error.details["body.code"].message) {
                            case "minLength 6":
                                newErrors.code = "Mínimo 6 caracteres";
                                break;
                            case "maxLength 6":
                                newErrors.code = "Máximo 6 caracteres";
                                break;
                            default:
                                newErrors.code = error.details["body.code"].message;
                                break;
                        }
                    };
                    setErrors(newErrors);
                } else if (error.code === "EMAIL_VERIFICATION_CODE_INVALID_OR_EXPIRED") {
                    setErrors(prev => ({ ...prev, code: "El código es inválido o ha expirado" }));
                } else if (error.code === "EMAIL_ALREADY_IN_USE") {
                    setStep(1);
                    setErrors(prev => ({ ...prev, email: "El email ya está en uso" }));
                } else if (error.code === "USERNAME_ALREADY_IN_USE") {
                    setErrors(prev => ({ ...prev, username: "El nombre de usuario ya está en uso" }));
                }
            }
        }
    });

    const handleNextStep = () => {
        if (!formData.email) {
            setErrors(prev => ({ ...prev, email: "El email es obligatorio" }));
            return;
        }
        initiateRegistration({ data: { email: formData.email, turnstileToken: formData.turnstileToken } });
    };

    const handleRegister = () => {
        const newErrors = {
            email: "",
            code: !formData.code ? "El código es obligatorio" : "",
            username: !formData.username ? "El nombre de usuario es obligatorio" : "",
            password: !formData.password ? "La contraseña es obligatoria" : formData.password.length < 8 ? "Mínimo 8 caracteres" : "",
            confirmPassword: formData.password !== formData.confirmPassword ? "Las contraseñas no coinciden" : "",
            acceptedTerms: !formData.acceptedTerms ? "Debes aceptar los términos y condiciones" : ""
        };

        setErrors(newErrors);

        if (newErrors.code || newErrors.username || newErrors.password || newErrors.confirmPassword || newErrors.acceptedTerms) {
            return;
        }

        completeRegistration({
            data: {
                email: formData.email,
                code: formData.code,
                username: formData.username,
                password: formData.password
            }
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const enterKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            if (step === 1) handleNextStep();
            else handleRegister();
        }
    };

    return (
        <AuthLayout>
            <AuthCard title={
                <>
                    <Logo size={32} />
                    <span>{step === 1 ? "Registrate en la plataforma" : "Completa tu perfil"}</span>
                </>
            }>
                <div className="flex flex-col gap-5">
                    {step === 1 ? (
                        <>
                            <p className="text-sm text-center text-content-muted">
                                Introduce tu email para recibir un código de verificación.
                            </p>
                            <FloatingLabelInput
                                value={formData.email}
                                onChange={handleChange}
                                type="email"
                                id="email"
                                name="email"
                                label="Email"
                                error={errors.email}
                                onKeyDown={enterKeyPress}
                                icon={<Mail size={18} />}
                            />

                            <TurnstileWidget 
                                onVerify={(token) => setFormData(prev => ({ ...prev, turnstileToken: token }))} 
                                onExpire={() => setFormData(prev => ({ ...prev, turnstileToken: "" }))}
                                onError={() => setFormData(prev => ({ ...prev, turnstileToken: "" }))}
                            />

                            <button
                                type="button"
                                onClick={handleNextStep}
                                disabled={isInitiating || !formData.turnstileToken}
                                className="mt-4 rounded-lg bg-brand p-3 text-content-on-brand font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isInitiating ? "Enviando código..." : "Continuar"}
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
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-center text-content/70">
                                Hemos enviado un código a <span className="font-bold text-brand">{formData.email}</span>.
                            </p>

                            <div className="flex justify-between items-center gap-4">
                                <FloatingLabelInput className="flex-1 bg-surface!"
                                    disabled={true}
                                    value={formData.email}
                                    type="email"
                                    id="email"
                                    name="email"
                                    label="Email"
                                    error={errors.email}
                                    icon={<Mail size={18} />}
                                />
                                <button
                                    onClick={() => setStep(1)}
                                    className="shrink-0 text-content-muted hover:underline hover:cursor-pointer text-xs"
                                >
                                    Cambiar email
                                </button>
                            </div>

                            <FloatingLabelInput
                                value={formData.code}
                                onChange={handleChange}
                                type="text"
                                id="code"
                                name="code"
                                label="Código de verificación"
                                error={errors.code}
                                onKeyDown={enterKeyPress}
                                icon={<ShieldCheck size={18} />}
                            />

                            <FloatingLabelInput
                                value={formData.username}
                                onChange={handleChange}
                                type="text"
                                id="username"
                                name="username"
                                label="Nombre de usuario"
                                error={errors.username}
                                onKeyDown={enterKeyPress}
                                icon={<UserIcon size={18} />}
                            />

                            <FloatingLabelInput
                                value={formData.password}
                                onChange={handleChange}
                                type="password"
                                id="password"
                                name="password"
                                label="Contraseña"
                                error={errors.password}
                                onKeyDown={enterKeyPress}
                                icon={<Lock size={18} />}
                            />

                            <FloatingLabelInput
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                type="password"
                                isRepeat
                                id="confirmPassword"
                                name="confirmPassword"
                                label="Confirmar contraseña"
                                error={errors.confirmPassword}
                                onKeyDown={enterKeyPress}
                                icon={<Lock size={18} />}
                            />

                            <div className="p-3 bg-brand/5 rounded-xl border border-line">
                                <h4 className="text-[10px] font-bold text-brand uppercase tracking-wider mb-1.5">Requisitos de seguridad:</h4>
                                <ul className="text-[10px] text-content-muted space-y-1 list-disc list-inside opacity-80">
                                    <li>Mínimo 8 caracteres</li>
                                    <li>Recomendamos incluir números y símbolos</li>
                                </ul>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                                        <input
                                            type="checkbox"
                                            name="acceptedTerms"
                                            id="acceptedTerms"
                                            checked={formData.acceptedTerms}
                                            onChange={handleChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className={`w-5 h-5 border rounded-md transition-all flex items-center justify-center ${formData.acceptedTerms ? 'bg-brand border-line text-content-on-brand animate-fade-in animate-duration-200' : `bg-main border-line ${!isHoveringLink ? 'group-hover:border-gray-400' : ''}`}`}>
                                            {formData.acceptedTerms && (
                                                <svg
                                                    className="w-3.5 h-3.5 fill-none stroke-current stroke-3 pointer-events-none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs text-content-muted leading-tight select-none">
                                        Acepto los <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline font-bold relative z-20" onClick={(e) => e.stopPropagation()} onMouseEnter={() => setIsHoveringLink(true)} onMouseLeave={() => setIsHoveringLink(false)}>Términos de Servicio</a> y la <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline font-bold relative z-20" onClick={(e) => e.stopPropagation()} onMouseEnter={() => setIsHoveringLink(true)} onMouseLeave={() => setIsHoveringLink(false)}>Política de Privacidad</a>
                                    </span>
                                </label>
                                {errors.acceptedTerms && <p className="text-[10px] text-red-500 ml-8 font-bold animate-shake">{errors.acceptedTerms}</p>}
                            </div>

                            <button
                                type="button"
                                onClick={handleRegister}
                                disabled={isCompleting}
                                className="mt-4 rounded-lg bg-brand p-3 text-content-on-brand font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCompleting ? "Creando cuenta..." : "Completar Registro"}
                            </button>
                        </>
                    )}



                    <span className="text-sm text-content text-center">
                        ¿Ya tienes cuenta? <a href="/login" className="text-brand font-bold hover:underline">Inicia sesión</a>
                    </span>
                </div>
            </AuthCard>
        </AuthLayout>
    );
}