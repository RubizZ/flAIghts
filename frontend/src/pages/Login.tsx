import { useLogin } from "@/api/generated/auth/auth";
import { useState } from "react";
import { toast } from "sonner";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthCard from "@/components/ui/AuthCard";
import FloatingLabelInput from "@/components/ui/FloatingLabelInput";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
    const navigate = useNavigate();
    const { refetch } = useAuth();
    const [credentials, setCredentials] = useState({ identifier: "", password: "" });
    const [errors, setErrors] = useState({ identifier: "", password: "" });

    const { mutate: performLogin, isPending } = useLogin({
        mutation: {
            onSuccess: async () => {
                // El token se guarda en una cookie HttpOnly
                toast.success("¡Bienvenido a bordo!");
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
                        toast.error("Credenciales inválidas");
                        break;
                }
            }
        }
    });

    const login = () => { // TODO Mejorar validacion
        const newErrors = {
            identifier: !credentials.identifier ? "Introduce tu email o nombre de usuario" : "",
            password: !credentials.password ? "Introduce tu contraseña" : ""
        };
        setErrors(newErrors);

        if (newErrors.identifier || newErrors.password) {
            toast.error("Por favor completa todos los campos");
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
            <AuthCard title="Inicio de sesión">
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
                        label="Email o nombre de usuario"
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
                        label="Contraseña"
                        error={errors.password}
                        onKeyDown={enterKeyPress}
                    />

                    <span className="text-sm text-primary text-right">
                        <a href="/forgot-password" className="text-accent hover:underline">¿Olvidaste tu contraseña?</a>
                    </span>

                    <button
                        type="button"
                        onClick={login}
                        disabled={isPending}
                        className={`mt-2 rounded-lg bg-accent p-3 text-on-accent font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100`}
                    >
                        {isPending ? "Conectando..." : "Login"}
                    </button>

                    <span className="text-sm text-primary text-center">
                        ¿No tienes cuenta? <a href="/register" className="text-accent font-bold hover:underline">Regístrate</a>
                    </span>
                </form>
            </AuthCard>
        </AuthLayout>
    )
}
