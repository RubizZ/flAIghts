import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useLoginWithGoogleWeb, useRequestLinkingResetCode } from "@/api/generated/openapi/auth";
import FloatingLabelInput from "@/components/ui/FloatingLabelInput";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

interface GoogleLinkingViewProps {
    linkData: { credential: string; email: string };
    turnstileToken: string;
    onCancel: () => void;
    onSuccess?: () => void;
}

export default function GoogleLinkingView({ linkData, turnstileToken, onCancel, onSuccess }: GoogleLinkingViewProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { refetch } = useAuth();
    const [linkPassword, setLinkPassword] = useState("");
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [transactionId, setTransactionId] = useState("");
    const [errors, setErrors] = useState({
        linkPassword: "",
        newPassword: "",
        confirmNewPassword: "",
        verificationCode: ""
    });

    const { mutate: performGoogleLogin, isPending: isGooglePending } = useLoginWithGoogleWeb({
        mutation: {
            onSuccess: async () => {
                toast.success(t("googleLinking.toast.success"));
                await refetch();
                onSuccess?.();
                navigate("/");
            },
            onError: (error) => {
                if (error.code === "INVALID_PASSWORD") {
                    toast.error(t("googleLinking.toast.invalidPassword"));
                } else if (error.code === "INVALID_RESET_CODE") {
                    toast.error(t("googleLinking.toast.invalidCode"));
                } else if (error.code === "TURNSTILE_MISSING_TOKEN" || error.code === "TURNSTILE_INVALID_TOKEN" || error.code === "TURNSTILE_TOKEN_ALREADY_SPENT" || error.code === "TURNSTILE_VERIFICATION_FAILED") {
                    toast.error(t("googleLinking.toast.verificationFailed"));
                } else {
                    toast.error(t("googleLinking.toast.error"));
                }
            }
        }
    });

    const { mutate: requestResetCode, isPending: isRequestingCode } = useRequestLinkingResetCode({
        mutation: {
            onSuccess: (response) => {
                toast.success(t("googleLinking.toast.codeSent"));
                setTransactionId(response.transactionId);
            },
            onError: () => {
                toast.error(t("googleLinking.toast.codeError"));
            }
        }
    });

    const handleConfirmLink = () => {
        const newErrors = { ...errors, linkPassword: !linkPassword ? t("googleLinking.validation.passwordRequired") : "" };
        setErrors(newErrors);
        
        if (newErrors.linkPassword) return;

        if (!turnstileToken) {
            toast.error(t("login.toast.turnstileRequired"));
            return;
        }

        performGoogleLogin({
            data: {
                credential: linkData.credential,
                password: linkPassword,
                turnstileToken
            }
        });
    };

    const handleResetAndLink = () => {
        const newErrors = {
            ...errors,
            newPassword: !newPassword ? t("googleLinking.validation.newPasswordRequired") : newPassword.length < 8 ? t("googleLinking.validation.passwordMin") : "",
            confirmNewPassword: !confirmNewPassword ? t("googleLinking.validation.confirmPasswordRequired") : newPassword !== confirmNewPassword ? t("googleLinking.validation.passwordsMismatch") : "",
            verificationCode: verificationCode.length !== 6 ? t("googleLinking.validation.codeRequired") : ""
        };
        setErrors(newErrors);

        if (newErrors.newPassword || newErrors.confirmNewPassword || newErrors.verificationCode) {
            toast.error(t("googleLinking.validation.fillAllFields"));
            return;
        }

        if (!turnstileToken) {
            toast.error(t("login.toast.turnstileRequired"));
            return;
        }

        performGoogleLogin({
            data: {
                credential: linkData.credential,
                newPassword,
                verificationCode,
                transactionId,
                turnstileToken
            }
        });
    };

    return (
        <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-500">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center border-2 border-brand/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>
                <div className="space-y-1">
                    <h3 className="font-bold text-content">{t("googleLinking.title")}</h3>
                    <p className="text-sm text-content-muted leading-relaxed">
                        {t("googleLinking.description", { email: linkData.email })}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {!isResettingPassword ? (
                    <>
                        <FloatingLabelInput
                            value={linkPassword}
                            onChange={(e) => {
                                setLinkPassword(e.target.value);
                                if (errors.linkPassword) setErrors({ ...errors, linkPassword: "" });
                            }}
                            type="password"
                            id="linkPassword"
                            name="linkPassword"
                            label={t("googleLinking.labels.password")}
                            error={errors.linkPassword}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleConfirmLink();
                            }}
                        />

                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsResettingPassword(true);
                                    requestResetCode({
                                        data: {
                                            email: linkData.email,
                                            turnstileToken
                                        }
                                    });
                                }}
                                className="text-xs text-brand hover:underline font-medium cursor-pointer"
                                disabled={isRequestingCode}
                            >
                                {isRequestingCode ? t("googleLinking.actions.sendingCode") : t("googleLinking.actions.forgotPassword")}
                            </button>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-3 rounded-lg bg-surface/50 border border-line text-content-muted hover:text-content hover:bg-surface/80 font-bold transition-all cursor-pointer"
                            >
                                {t("googleLinking.actions.back")}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmLink}
                                disabled={isGooglePending}
                                className="flex-1 rounded-lg bg-brand p-3 text-content-on-brand font-bold enabled:hover:scale-[1.02] enabled:active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50"
                            >
                                {isGooglePending ? t("googleLinking.actions.linking") : t("googleLinking.actions.confirmAndLink")}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <FloatingLabelInput
                            value={newPassword}
                            onChange={(e) => {
                                setNewPassword(e.target.value);
                                if (errors.newPassword) setErrors({ ...errors, newPassword: "" });
                            }}
                            type="password"
                            id="newPassword"
                            name="newPassword"
                            label={t("googleLinking.labels.newPassword")}
                            error={errors.newPassword}
                        />
                        <FloatingLabelInput
                            value={confirmNewPassword}
                            onChange={(e) => {
                                setConfirmNewPassword(e.target.value);
                                if (errors.confirmNewPassword) setErrors({ ...errors, confirmNewPassword: "" });
                            }}
                            type="password"
                            id="confirmNewPassword"
                            name="confirmNewPassword"
                            label={t("googleLinking.labels.confirmPassword")}
                            error={errors.confirmNewPassword}
                        />
                        <div className="pt-2">
                            <FloatingLabelInput
                                value={verificationCode}
                                onChange={(e) => {
                                    setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6));
                                    if (errors.verificationCode) setErrors({ ...errors, verificationCode: "" });
                                }}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                id="verificationCode"
                                name="verificationCode"
                                label={t("googleLinking.labels.verificationCode")}
                                placeholder="123456"
                                error={errors.verificationCode}
                            />
                            <p className="text-[10px] text-content-muted mt-1 px-1">
                                {t("googleLinking.verificationSent")}
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsResettingPassword(false);
                                    setNewPassword("");
                                    setConfirmNewPassword("");
                                }}
                                className="px-4 py-3 rounded-lg bg-surface/50 border border-line text-content-muted hover:text-content hover:bg-surface/80 font-bold transition-all cursor-pointer"
                            >
                                {t("googleLinking.actions.back")}
                            </button>
                            <button
                                type="button"
                                onClick={handleResetAndLink}
                                disabled={isGooglePending}
                                className="flex-1 rounded-lg bg-brand p-3 text-content-on-brand font-bold enabled:hover:scale-[1.02] enabled:active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50"
                            >
                                {isGooglePending ? t("googleLinking.actions.linking") : t("googleLinking.actions.resetAndLink")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
