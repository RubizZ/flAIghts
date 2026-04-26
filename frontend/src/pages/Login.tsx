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
import TurnstileWidget, { type TurnstileWidgetRef } from "@/components/ui/TurnstileWidget";
import GoogleLinkingView from "@/components/auth/GoogleLinkingView";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import Tooltip from "@/components/ui/Tooltip";

export default function Login() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { refetch, isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate("/");
        }
    }, [isAuthenticated, isLoading, navigate]);

    const [credentials, setCredentials] = useState({ identifier: "", password: "" });
    const [turnstileToken, setTurnstileToken] = useState<string>("");
    const turnstileRef = useRef<TurnstileWidgetRef>(null);
    const [errors, setErrors] = useState({ identifier: "", password: "" });
    const [googleLinkData, setGoogleLinkData] = useState<{ credential: string, email: string } | null>(null);
    const googleCredentialRef = useRef<string | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        if (!isLoading) {
            setIsInitialLoad(false);
        }
    }, [isLoading]);

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
                                    newErrors.identifier = t("login.validation.identifierMin");
                                    break;
                                default:
                                    newErrors.identifier = error.details["body.identifier"].message;
                                    break;
                            }
                        }
                        if (error.details["body.password"]) {
                            switch (error.details["body.password"].message) {
                                case "minLength 8":
                                    newErrors.password = t("login.validation.passwordMin");
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
                        toast.error(t("login.toast.invalidCredentials"));
                        break;
                    case "TURNSTILE_MISSING_TOKEN":
                        toast.error(t("login.toast.turnstileRequired"));
                        break;
                    case "TURNSTILE_INVALID_TOKEN":
                    case "TURNSTILE_TOKEN_ALREADY_SPENT":
                        toast.error(t("login.toast.turnstileInvalid"));
                        turnstileRef.current?.reset();
                        break;
                    case "TURNSTILE_VERIFICATION_FAILED":
                        toast.error(t("login.toast.turnstileFailed"));
                        break;
                }
            }
        }
    });

    const { mutate: performGoogleLogin, isPending: isGooglePending } = useLoginWithGoogleWeb({
        mutation: {
            onSuccess: async () => {
                toast.success(googleLinkData ? t("login.toast.googleLinked") : t("login.toast.googleSuccess"));
                setGoogleLinkData(null);
                await refetch();
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
                } else if (error.code === "INVALID_RESET_CODE") {
                    toast.error(t("login.toast.googleInvalidCode"));
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

    const login = () => {
        const newErrors = {
            identifier: !credentials.identifier ? t("login.validation.identifierRequired") : "",
            password: !credentials.password ? t("login.validation.passwordRequired") : ""
        };
        setErrors(newErrors);

        if (newErrors.identifier || newErrors.password) {
            toast.error(t("login.validation.fillAllFields"));
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

    if (isLoading && isInitialLoad) {
        return (
            <AuthLayout>
                <div className="flex flex-col items-center gap-6 py-12 animate-in fade-in zoom-in duration-500">
                    <div className="relative">
                        <Logo size={64} className="animate-pulse" />
                        <div className="absolute inset-0 bg-brand/20 blur-2xl rounded-full -z-10 animate-pulse" />
                    </div>
                    <div className="flex flex-col items-center gap-3">
                        <span className="text-content-muted font-medium tracking-wide">{t("login.verifyingSession")}</span>
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
                    <span>{t("login.title")}</span>
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
                    /* ================= PASO 1: LOGIN NORMAL ================= */
                    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6 animate-in fade-in duration-500">
                        <FloatingLabelInput
                            value={credentials.identifier}
                            onChange={(e) => {
                                setCredentials({ ...credentials, identifier: e.target.value });
                                if (errors.identifier) setErrors({ ...errors, identifier: "" });
                            }}
                            type="text"
                            id="identifier"
                            name="identifier"
                            label={t("login.labels.identifier")}
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
                            label={t("login.labels.password")}
                            error={errors.password}
                            onKeyDown={enterKeyPress}
                        />

                        <span className="text-sm text-content text-right">
                            <a href="/forgot-password" className="text-brand hover:underline">{t("login.links.forgotPassword")}</a>
                        </span>

                        <Tooltip content={t("turnstile.verifying")} disabled={!!turnstileToken} position="top">
                            <button
                                type="button"
                                onClick={login}
                                disabled={isPending || !turnstileToken}
                                className={`mt-2 rounded-lg bg-brand p-3 text-content-on-brand font-bold enabled:hover:scale-[1.02] enabled:active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isPending ? t("login.actions.loggingIn") : t("login.actions.login")}
                            </button>
                        </Tooltip>

                        <div className="relative flex py-2 items-center">
                            <div className="grow border-t border-content-muted/30"></div>
                            <span className="shrink-0 mx-4 text-content-muted text-sm">{t("login.orContinueWith")}</span>
                            <div className="grow border-t border-content-muted/30"></div>
                        </div>

                        <Tooltip content={t("turnstile.verifying")} disabled={!!turnstileToken} position="top">
                            <div className={`w-full flex justify-center transition-opacity duration-300 ${!turnstileToken ? "opacity-50 cursor-not-allowed" : ""}`}>
                                <div className={!turnstileToken ? "pointer-events-none" : ""}>
                                    <GoogleLogin
                                        onSuccess={credentialResponse => {
                                            if (credentialResponse.credential) {
                                                const credential = credentialResponse.credential;
                                                googleCredentialRef.current = credential;
                                                performGoogleLogin({
                                                    data: {
                                                        credential,
                                                        turnstileToken
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

                        <span className="text-sm text-content text-center">
                            {t("login.noAccount")} <a href="/register" className="text-brand font-bold hover:underline">{t("login.links.register")}</a>
                        </span>
                    </form>
                )}
            </AuthCard>
            <TurnstileWidget
                ref={turnstileRef}
                onVerify={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
                onError={() => setTurnstileToken("")}
            />
        </AuthLayout>
    )
}
