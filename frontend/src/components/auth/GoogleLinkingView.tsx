import { useState } from "react";
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
    const navigate = useNavigate();
    const { refetch } = useAuth();
    const [linkPassword, setLinkPassword] = useState("");
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [transactionId, setTransactionId] = useState("");

    const { mutate: performGoogleLogin, isPending: isGooglePending } = useLoginWithGoogleWeb({
        mutation: {
            onSuccess: async () => {
                toast.success("Cuentas vinculadas correctamente");
                await refetch();
                onSuccess?.();
                navigate("/");
            },
            onError: (error) => {
                if (error.code === "INVALID_PASSWORD") {
                    toast.error("Contraseña incorrecta para vincular la cuenta.");
                } else if (error.code === "INVALID_RESET_CODE") {
                    toast.error("El código de verificación es inválido o ha expirado.");
                } else if (error.code === "TURNSTILE_MISSING_TOKEN" || error.code === "TURNSTILE_INVALID_TOKEN" || error.code === "TURNSTILE_TOKEN_ALREADY_SPENT" || error.code === "TURNSTILE_VERIFICATION_FAILED") {
                    toast.error("La verificación de seguridad ha fallado o caducado. Inténtalo de nuevo.");
                } else {
                    toast.error("Error al vincular la cuenta.");
                }
            }
        }
    });

    const { mutate: requestResetCode, isPending: isRequestingCode } = useRequestLinkingResetCode({
        mutation: {
            onSuccess: (response) => {
                toast.success("Código de verificación enviado a tu email.");
                setTransactionId(response.transactionId);
            },
            onError: () => {
                toast.error("Error al enviar el código de verificación.");
            }
        }
    });

    const handleConfirmLink = () => {
        if (!linkPassword) return;
        performGoogleLogin({
            data: {
                credential: linkData.credential,
                password: linkPassword,
                turnstileToken
            }
        });
    };

    const handleResetAndLink = () => {
        if (newPassword.length < 8) {
            toast.error("La contraseña debe tener al menos 8 caracteres");
            return;
        }
        if (newPassword !== confirmNewPassword) {
            toast.error("Las contraseñas no coinciden");
            return;
        }
        if (verificationCode.length !== 6) {
            toast.error("Introduce el código de verificación de 6 dígitos");
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
                    <h3 className="font-bold text-content">Cuenta existente</h3>
                    <p className="text-sm text-content-muted leading-relaxed">
                        Hemos detectado que ya tienes una cuenta con <span className="text-content font-medium">{linkData.email}</span>.
                        <br />
                        Introduce tu contraseña de flAIghts para vincularla.
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {!isResettingPassword ? (
                    <>
                        <FloatingLabelInput
                            value={linkPassword}
                            onChange={(e) => setLinkPassword(e.target.value)}
                            type="password"
                            id="linkPassword"
                            name="linkPassword"
                            label="Contraseña de flAIghts"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && linkPassword) handleConfirmLink();
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
                                {isRequestingCode ? "Enviando código..." : "He olvidado mi contraseña"}
                            </button>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-3 rounded-lg bg-surface/50 border border-line text-content-muted hover:text-content hover:bg-surface/80 font-bold transition-all cursor-pointer"
                            >
                                Volver
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmLink}
                                disabled={!linkPassword || isGooglePending || !turnstileToken}
                                className="flex-1 rounded-lg bg-brand p-3 text-content-on-brand font-bold enabled:hover:scale-[1.02] enabled:active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50"
                            >
                                {isGooglePending ? "Vinculando..." : "Confirmar y Vincular"}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <FloatingLabelInput
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            type="password"
                            id="newPassword"
                            name="newPassword"
                            label="Nueva contraseña"
                        />
                        <FloatingLabelInput
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            type="password"
                            id="confirmNewPassword"
                            name="confirmNewPassword"
                            label="Confirmar nueva contraseña"
                        />
                        <div className="pt-2">
                            <FloatingLabelInput
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                id="verificationCode"
                                name="verificationCode"
                                label="Código de verificación (6 dígitos)"
                                placeholder="123456"
                            />
                            <p className="text-[10px] text-content-muted mt-1 px-1">
                                Te hemos enviado un código a tu email para confirmar el cambio.
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
                                Volver
                            </button>
                            <button
                                type="button"
                                onClick={handleResetAndLink}
                                disabled={!newPassword || !confirmNewPassword || verificationCode.length !== 6 || isGooglePending || !turnstileToken}
                                className="flex-1 rounded-lg bg-brand p-3 text-content-on-brand font-bold enabled:hover:scale-[1.02] enabled:active:scale-95 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50"
                            >
                                {isGooglePending ? "Vinculando..." : "Restablecer y Vincular"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
