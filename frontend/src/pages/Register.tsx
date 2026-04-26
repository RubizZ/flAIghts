import { useState, useEffect, useRef } from "react";
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
import TurnstileWidget, { type TurnstileWidgetRef } from "@/components/ui/TurnstileWidget";
import GoogleLinkingView from "@/components/auth/GoogleLinkingView";
import { useTranslation } from "react-i18next";
import Tooltip from "@/components/ui/Tooltip";

export default function Register() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isAuthenticated, isLoading } = useAuth();

    const [step, setStep] = useState<1 | 2>(1);
    const [transactionId, setTransactionId] = useState("");
    const [formData, setFormData] = useState({
        email: "",
        code: "",
        username: "",
        password: "",
        confirmPassword: "",
        acceptedTerms: false,
        turnstileToken: "",
        turnstileTokenStep2: ""
    });
    const turnstileRef = useRef<TurnstileWidgetRef>(null);
    const [isHoveringLink, setIsHoveringLink] = useState(false);
    const [errors, setErrors] = useState({
        email: "",
        code: "",
        username: "",
        password: "",
        confirmPassword: "",
        acceptedTerms: ""
    });
    const [googleLinkData, setGoogleLinkData] = useState<{ credential: string, email: string } | null>(null);
    const googleCredentialRef = useRef<string | null>(null);

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
                toast.error(t("register.toast.loginError"));
                navigate("/login");
            }
        }
    });

    const { mutate: performGoogleLogin, isPending: isGooglePending } = useLoginWithGoogleWeb({
        mutation: {
            onSuccess: () => {
                toast.success(googleLinkData ? t("login.toast.googleLinked") : t("login.toast.googleSuccess"));
                setGoogleLinkData(null);
                queryClient.invalidateQueries({ queryKey: getGetSelfUserQueryKey() });
                navigate("/");
            },
            onError: (error) => {
                if (error.code === "ACCOUNT_LINK_REQUIRED") {
                    setGoogleLinkData({
                        credential: googleCredentialRef.current || "",
                        email: error.details.email
                    });
                    turnstileRef.current?.reset();
                    toast.info(t("login.toast.googleAccountDetected"));
                } else if (error.code === "TURNSTILE_MISSING_TOKEN" || error.code === "TURNSTILE_INVALID_TOKEN" || error.code === "TURNSTILE_TOKEN_ALREADY_SPENT" || error.code === "TURNSTILE_VERIFICATION_FAILED") {
                    toast.error(t("login.toast.googleVerificationFailed"));
                    turnstileRef.current?.reset();
                } else {
                    setGoogleLinkData(null);
                    toast.error(t("login.toast.googleError"));
                }
            }
        }
    });

    const { mutate: initiateRegistration, isPending: isInitiating } = useInitiateRegistration({
        mutation: {
            onSuccess: (response) => {
                toast.success(t("register.toast.verificationEmailSent"));
                setTransactionId(response.transactionId);
                setStep(2);
                turnstileRef.current?.reset();
            },
            onError: (error) => {
                const newErrors = { ...errors };
                if (error.code === "EMAIL_ALREADY_IN_USE") {
                    newErrors.email = t("register.validation.emailInUse");
                } else if (error.code === "REQUEST_VALIDATION_ERROR") {
                    if (error.details["body.email"]) newErrors.email = t("register.validation.emailInvalid");
                } else if (error.code === "TURNSTILE_MISSING_TOKEN") {
                    toast.error(t("login.toast.turnstileRequired"));
                } else if (error.code === "TURNSTILE_INVALID_TOKEN" || error.code === "TURNSTILE_TOKEN_ALREADY_SPENT") {
                    toast.error(t("login.toast.turnstileInvalid"));
                    turnstileRef.current?.reset();
                } else if (error.code === "TURNSTILE_VERIFICATION_FAILED") {
                    toast.error(t("login.toast.turnstileFailed"));
                }
                setErrors(newErrors);
            }
        }
    });

    const { mutate: completeRegistration, isPending: isCompleting } = useCompleteRegistration({
        mutation: {
            onSuccess: () => {
                if (formData.turnstileTokenStep2) {
                    performLogin({
                        data: {
                            identifier: formData.email,
                            password: formData.password,
                            turnstileToken: formData.turnstileTokenStep2
                        }
                    });
                } else {
                    toast.success(t("register.toast.accountCreated"));
                    navigate("/login");
                }
            },
            onError: (error) => {
                if (error.code === "REQUEST_VALIDATION_ERROR") {
                    error.details
                    const newErrors = { ...errors };
                    if (error.details["body.username"]) {
                        switch (error.details["body.username"].message) {
                            case "minLength 3":
                                newErrors.username = t("register.validation.usernameMin");
                                break;
                            case "maxLength 20":
                                newErrors.username = t("register.validation.usernameMax");
                                break;
                            default:
                                newErrors.username = error.details["body.username"].message;
                                break;
                        }
                    };
                    if (error.details["body.password"]) {
                        switch (error.details["body.password"].message) {
                            case "minLength 8":
                                newErrors.password = t("register.validation.passwordMin");
                                break;
                            default:
                                newErrors.password = error.details["body.password"].message;
                                break;
                        }
                    };
                    if (error.details["body.code"]) {
                        switch (error.details["body.code"].message) {
                            case "minLength 6":
                            case "maxLength 6":
                                newErrors.code = t("register.validation.codeLength");
                                break;
                            default:
                                newErrors.code = error.details["body.code"].message;
                                break;
                        }
                    };
                    setErrors(newErrors);
                } else if (error.code === "EMAIL_VERIFICATION_CODE_INVALID_OR_EXPIRED") {
                    setErrors(prev => ({ ...prev, code: t("register.validation.invalidCode") }));
                } else if (error.code === "EMAIL_ALREADY_IN_USE") {
                    setStep(1);
                    setErrors(prev => ({ ...prev, email: t("register.validation.emailInUse") }));
                } else if (error.code === "USERNAME_ALREADY_IN_USE") {
                    setErrors(prev => ({ ...prev, username: t("register.validation.usernameInUse") }));
                }
            }
        }
    });

    const handleNextStep = () => {
        const newErrors = { ...errors, email: !formData.email ? t("register.validation.emailRequired") : "" };
        setErrors(newErrors);

        if (newErrors.email) return;

        if (!formData.turnstileToken) {
            toast.error(t("login.toast.turnstileRequired"));
            return;
        }

        initiateRegistration({ data: { email: formData.email, turnstileToken: formData.turnstileToken } });
    };

    const handleRegister = () => {
        const newErrors = {
            email: "",
            code: !formData.code ? t("register.validation.codeRequired") : "",
            username: !formData.username ? t("register.validation.usernameRequired") : "",
            password: !formData.password ? t("register.validation.passwordRequired") : formData.password.length < 8 ? t("register.validation.passwordMin") : "",
            confirmPassword: !formData.confirmPassword ? "Debes confirmar la contraseña" : formData.password !== formData.confirmPassword ? t("register.validation.confirmPasswordRequired") : "",
            acceptedTerms: !formData.acceptedTerms ? t("register.validation.acceptedTerms") : ""
        };

        setErrors(newErrors);

        if (newErrors.code || newErrors.username || newErrors.password || newErrors.confirmPassword || newErrors.acceptedTerms) {
            toast.error("Por favor completa todos los campos correctamente");
            return;
        }

        completeRegistration({
            data: {
                email: formData.email,
                code: formData.code,
                username: formData.username,
                password: formData.password,
                transactionId: transactionId
            }
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        let finalValue: string | boolean = type === 'checkbox' ? checked : value;

        if (name === 'code') {
            finalValue = String(finalValue).replace(/\D/g, '');
        }

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
                    <span>{step === 1 ? t("register.steps.step1Title") : t("register.steps.step2Title")}</span>
                </>
            }>
                {googleLinkData ? (
                    <GoogleLinkingView
                        linkData={googleLinkData}
                        onCancel={() => {
                            setGoogleLinkData(null);
                            turnstileRef.current?.reset();
                        }}
                        onSuccess={() => setGoogleLinkData(null)}
                    />
                ) : (
                    <div className="flex flex-col gap-5">
                        {step === 1 ? (
                            <>
                                <p className="text-sm text-center text-content-muted">
                                    {t("register.steps.step1Description")}
                                </p>
                                <FloatingLabelInput
                                    value={formData.email}
                                    onChange={handleChange}
                                    type="email"
                                    id="email"
                                    name="email"
                                    label={t("register.labels.email")}
                                    error={errors.email}
                                    onKeyDown={enterKeyPress}
                                    icon={<Mail size={18} />}
                                />


                                <Tooltip content={t("turnstile.verifying")} disabled={!!formData.turnstileToken} position="top">
                                    <button
                                        type="button"
                                        onClick={handleNextStep}
                                        disabled={isInitiating || !formData.turnstileToken}
                                        className="mt-4 rounded-lg bg-brand p-3 text-content-on-brand font-bold enabled:hover:scale-[1.02] enabled:active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isInitiating ? t("register.actions.sendingCode") : t("register.actions.nextStep")}
                                    </button>
                                </Tooltip>

                                <div className="relative flex py-2 items-center">
                                    <div className="grow border-t border-content-muted/30"></div>
                                    <span className="shrink-0 mx-4 text-content-muted text-sm">{t("login.orContinueWith")}</span>
                                    <div className="grow border-t border-content-muted/30"></div>
                                </div>

                                <Tooltip content={t("turnstile.verifying")} disabled={!!formData.turnstileToken} position="top">
                                    <div className={`w-full flex justify-center transition-opacity duration-300 ${!formData.turnstileToken ? "opacity-50 cursor-not-allowed" : ""}`}>
                                        <div className={!formData.turnstileToken ? "pointer-events-none" : ""}>
                                            <GoogleLogin
                                                onSuccess={credentialResponse => {
                                                    if (credentialResponse.credential) {
                                                        const credential = credentialResponse.credential;
                                                        googleCredentialRef.current = credential;
                                                        performGoogleLogin({
                                                            data: {
                                                                credential,
                                                                turnstileToken: formData.turnstileToken
                                                            }
                                                        });
                                                    }
                                                }}
                                                onError={() => {
                                                    toast.error(t("login.toast.googleConnectError"));
                                                }}
                                                theme='filled_blue'
                                                shape="circle"
                                                text="continue_with"
                                            />
                                        </div>
                                    </div>
                                </Tooltip>
                            </>
                        ) : (
                            <>
                                <div className="flex flex-col items-center gap-4 py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-brand/20 blur-xl rounded-full animate-pulse" />
                                        <div className="relative bg-brand/10 p-4 rounded-full border border-brand/20">
                                            <Mail className="text-brand size-8 animate-radar-slow" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-lg font-bold text-content">{t("register.codeSentTitle")}</h3>
                                        <p className="text-sm text-center text-content-muted">
                                            {t("register.codeSent")} <span className="font-medium text-brand">{formData.email}</span>
                                        </p>
                                    </div>
                                </div>

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
                                        {t("register.actions.changeEmail")}
                                    </button>
                                </div>

                                <FloatingLabelInput
                                    value={formData.code}
                                    onChange={handleChange}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    id="code"
                                    name="code"
                                    label={t("register.labels.code")}
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
                                    label={t("register.labels.username")}
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
                                    label={t("register.labels.password")}
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
                                    label={t("register.labels.confirmPassword")}
                                    error={errors.confirmPassword}
                                    onKeyDown={enterKeyPress}
                                    icon={<Lock size={18} />}
                                />

                                <div className="p-3 bg-brand/5 rounded-xl border border-line">
                                    <h4 className="text-[10px] font-bold text-brand uppercase tracking-wider mb-1.5">{t("settings.security.password.requirements.title")}</h4>
                                    <ul className="text-[10px] text-content-muted space-y-1 list-disc list-inside opacity-80">
                                        <li>{t("settings.security.password.requirements.minLength")}</li>
                                        <li>{t("settings.security.password.requirements.recommended")}</li>
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
                                            {t("register.iAccept")} <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline font-bold relative z-20" onClick={(e) => e.stopPropagation()} onMouseEnter={() => setIsHoveringLink(true)} onMouseLeave={() => setIsHoveringLink(false)}>{t("register.links.terms")}</a>{t("common.andThe")}<a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline font-bold relative z-20" onClick={(e) => e.stopPropagation()} onMouseEnter={() => setIsHoveringLink(true)} onMouseLeave={() => setIsHoveringLink(false)}>{t("register.links.privacy")}</a>
                                        </span>
                                    </label>
                                    {errors.acceptedTerms && <p className="text-[10px] text-red-500 ml-8 font-bold animate-shake">{errors.acceptedTerms}</p>}
                                </div>


                                <Tooltip content={t("turnstile.verifying")} disabled={!!formData.turnstileTokenStep2} position="top">
                                    <button
                                        type="button"
                                        onClick={handleRegister}
                                        disabled={isCompleting || !formData.turnstileTokenStep2}
                                        className="mt-4 rounded-lg bg-brand p-3 text-content-on-brand font-bold enabled:hover:scale-[1.02] enabled:active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isCompleting ? t("register.actions.creatingAccount") : t("register.actions.completeRegistration")}
                                    </button>
                                </Tooltip>
                            </>
                        )}



                        <span className="text-sm text-content text-center">
                            {t("register.alreadyHaveAccount")} <a href="/login" className="text-brand font-bold hover:underline">{t("register.links.login")}</a>
                        </span>
                    </div>
                )}
            </AuthCard>
            <TurnstileWidget
                ref={turnstileRef}
                onVerify={(token) => {
                    setFormData(prev => ({
                        ...prev,
                        turnstileToken: token,
                        turnstileTokenStep2: token
                    }));
                }}
                onExpire={() => setFormData(prev => ({ ...prev, turnstileToken: "", turnstileTokenStep2: "" }))}
                onError={() => setFormData(prev => ({ ...prev, turnstileToken: "", turnstileTokenStep2: "" }))}
            />
        </AuthLayout>
    );
}