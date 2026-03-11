import { useLogin } from "@/api/generated/auth/auth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthCard from "@/components/ui/AuthCard";
import FloatingLabelInput from "@/components/ui/FloatingLabelInput";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";


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
    const [errors, setErrors] = useState({ identifier: "", password: "" });

    const { mutate: performLogin, isPending } = useLogin({
        mutation: {
            onSuccess: async () => {
                // El token se guarda en una cookie HttpOnly
                toast.success(t("login.toast.welcome"));
                await refetch();
                navigate("/");
            },
            onError: (error) => {
                switch (error.code) {
                    case "REQUEST_VALIDATION_ERROR":
                        const newErrors = {
                            identifier: error.details["body.identifier"]?.message || "",
                            password: error.details["body.password"]?.message || ""
                        }
                        setErrors(newErrors);
                        break;
                    case "INVALID_CREDENTIALS":
                        toast.error(t("login.toast.invalidCredentials"));
                        break;
                }


            }
        }
    });

    const login = () => { // TODO Mejorar validacion
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
                responseType: 'cookie'
            }
        });
    }

    const enterKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            login();
        }
    }

    return (
        <AuthLayout>
            <AuthCard title={t("login.title")}>
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

                    <button
                        type="button"
                        onClick={login}
                        disabled={isPending}
                        className={`mt-2 rounded-lg bg-brand p-3 text-content-on-brand font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100`}
                    >
                        {isPending ? t("login.actions.loggingIn") : t("login.actions.login")}
                    </button>

                    <span className="text-sm text-content text-center">
                        {t("login.noAccount")} <a href="/register" className="text-brand font-bold hover:underline">{t("login.links.register")}</a>
                    </span>
                </form>
            </AuthCard>
        </AuthLayout>
    )
}
