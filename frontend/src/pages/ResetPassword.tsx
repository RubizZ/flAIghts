import { useResetPassword } from "@/api/generated/auth/auth";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthCard from "@/components/ui/AuthCard";
import FloatingLabelInput from "@/components/ui/FloatingLabelInput";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";


export default function ResetPassword() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    if (!token) {
        throw new Error(t("forgotPassword.validation.tokenMissing"));
    }

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState({ password: "", confirmPassword: "" });

    const { mutate: performResetPassword, isPending } = useResetPassword({
        mutation: {
            onSuccess: () => {
                toast.success(t("resetPassword.toast.success"));
                navigate("/login");
            },
            onError: (error) => {
                switch (error.code) {
                    case "RESET_TOKEN_INVALID_OR_EXPIRED":
                        toast.error(t("resetPassword.toast.tokenInvalid"));
                        break;
                    case "REQUEST_VALIDATION_ERROR":
                        if (error.details["body.newPassword"]) {
                            setErrors({ ...errors, password: error.details["body.newPassword"].message });
                        }
                        break;
                    case "DATABASE_VALIDATION_ERROR": // TODO Mejorar validacion de base de datos
                        toast.error(error.message);
                        break;
                }
            }
        }
    })

    const resetPassword = () => {
        const newErrors = { password: "", confirmPassword: "" };
        if (!password) {
            newErrors.password = t("resetPassword.validation.passwordRequired");
        }
        if (password !== confirmPassword) {
            newErrors.confirmPassword = t("resetPassword.validation.confirmPasswordMissmatch");
        }
        if (!password || password !== confirmPassword) {
            setErrors(newErrors);
            toast.error(t("resetPassword.toast.correctErrors"));
            return;
        }
        performResetPassword({
            data: {
                token,
                newPassword: password
            }
        });
    }

    return (
        <AuthLayout>
            <AuthCard title={t("resetPassword.title")}>
                <FloatingLabelInput
                    label={t("resetPassword.labels.newPassword")}
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors({ ...errors, password: "" }); }}
                    error={errors.password}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); resetPassword(); } }}
                />
                <FloatingLabelInput
                    label={t("resetPassword.labels.confirmPassword")}
                    type="password"
                    isRepeat
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrors({ ...errors, confirmPassword: "" }); }}
                    error={errors.confirmPassword}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); resetPassword(); } }}
                />
                <button
                    type="button"
                    onClick={resetPassword}
                    disabled={isPending}
                    className={`mt-2 rounded-lg bg-brand p-3 text-content-on-brand font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100`}
                >
                    {isPending ? t("resetPassword.actions.resetting") : t("resetPassword.actions.reset")}
                </button>
            </AuthCard>
        </AuthLayout>
    );
}