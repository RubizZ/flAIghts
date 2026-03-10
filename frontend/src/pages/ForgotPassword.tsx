import { useForgotPassword } from "@/api/generated/auth/auth";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthCard from "@/components/ui/AuthCard";
import FloatingLabelInput from "@/components/ui/FloatingLabelInput";
import { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function ForgotPassword(): JSX.Element {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
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

        forgotPassword({ data: { email } });
    }

    return (
        <AuthLayout>
            <AuthCard title={t("forgotPassword.title")}>
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
                    <button disabled={isPending} onClick={handleSubmit} type="button" className="mt-2 rounded-lg bg-brand p-3 text-content-on-brand font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
                        {isPending ? t("forgotPassword.actions.sending") : t("forgotPassword.actions.send")}
                    </button>
                </form>
            </AuthCard>
        </AuthLayout>
    )
}