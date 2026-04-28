import { useForgotPassword } from "@/api/generated/openapi/auth";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthCard from "@/components/ui/AuthCard";
import FloatingLabelInput from "@/components/ui/FloatingLabelInput";
import { JSX } from "react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import Logo from "@/components/ui/Logo";
import TurnstileWidget, { type TurnstileWidgetRef } from "@/components/ui/TurnstileWidget";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

export default function ForgotPassword(): JSX.Element {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [turnstileToken, setTurnstileToken] = useState<string>('');
    const turnstileRef = useRef<TurnstileWidgetRef>(null);
    const [error, setError] = useState('');

    const { mutate: forgotPassword, isPending } = useForgotPassword({
        mutation: {
            onSuccess: () => {
                toast.success(t("forgotPassword.toast.resetLinkSent"));
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
                    case "TURNSTILE_TOKEN_ALREADY_SPENT":
                        toast.error("La verificación ha caducado o es inválida. Por favor, verifica de nuevo.");
                        turnstileRef.current?.reset();
                        break;
                    case "TURNSTILE_VERIFICATION_FAILED":
                        toast.error("La verificación de seguridad ha fallado. Por favor, inténtalo de nuevo.");
                        break;
                    default: {
                        toast.error(t("forgotPassword.toast.unknownError"));
                        break;
                    }
                }
            }
        }
    })

    const handleSubmit = () => {
        if (!email) {
            setError(t("forgotPassword.validation.emailRequired"));
            return;
        }

        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            setError(t("forgotPassword.validation.emailInvalid"));
            return;
        }

        if (!turnstileToken) {
            toast.error("Por favor, completa la verificación de seguridad.");
            return;
        }

        forgotPassword({ data: { email, turnstileToken } });
    }

    return (
        <AuthLayout>
            <Helmet>
                <title>{t("seo.forgotPassword.title")}</title>
                <meta name="description" content={t("seo.forgotPassword.description")} />
            </Helmet>
            <AuthCard title={
                <>
                    <Logo size={32} />
                    <span>{t("forgotPassword.title")}</span>
                </>
            }>
                <form action="" className="flex flex-col gap-4">
                    <p className="text-center text-content-muted text-sm text-muted-foreground">
                        {t("forgotPassword.description")}
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
                    <div className="flex gap-3 mt-2">
                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="flex-1 px-4 py-3 rounded-lg bg-surface/50 border border-line text-content-muted hover:text-content hover:bg-surface/80 font-bold transition-all cursor-pointer text-sm"
                        >
                            Volver
                        </button>
                        <button
                            disabled={isPending}
                            onClick={handleSubmit}
                            type="button"
                            className="flex-[2] rounded-lg bg-brand p-3 text-content-on-brand font-bold enabled:hover:scale-[1.02] enabled:active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? 'Enviando...' : 'Enviar'}
                        </button>
                    </div>
                </form>
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