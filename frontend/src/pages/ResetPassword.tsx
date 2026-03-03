import { useResetPassword } from "@/api/generated/auth/auth";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthCard from "@/components/ui/AuthCard";
import FloatingLabelInput from "@/components/ui/FloatingLabelInput";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    if (!token) {
        throw new Error("Token de restablecimiento no encontrado");
    }

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState({ password: "", confirmPassword: "" });

    const { mutate: performResetPassword, isPending } = useResetPassword({
        mutation: {
            onSuccess: () => {
                toast.success("Contraseña restablecida correctamente");
                navigate("/login");
            },
            onError: (error) => {
                switch (error.code) {
                    case "RESET_TOKEN_INVALID_OR_EXPIRED":
                        toast.error("El token de restablecimiento es inválido o ha expirado");
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
            newErrors.password = "Introduce una contraseña";
        }
        if (password !== confirmPassword) {
            newErrors.confirmPassword = "Las contraseñas no coinciden";
        }
        if (!password || password !== confirmPassword) {
            setErrors(newErrors);
            toast.error("Por favor corrige los errores");
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
            <AuthCard title="Reset Password">
                <FloatingLabelInput
                    label="New Password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors({ ...errors, password: "" }); }}
                    error={errors.password}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); resetPassword(); } }}
                />
                <FloatingLabelInput
                    label="Confirm Password"
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
                    className={`mt-2 rounded-lg bg-accent p-3 text-on-accent font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100`}
                >
                    {isPending ? "Restableciendo contraseña..." : "Restablecer contraseña"}
                </button>
            </AuthCard>
        </AuthLayout>
    );
}