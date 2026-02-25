import { useState } from "react";
import { toast } from "sonner";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthCard from "@/components/ui/AuthCard";
import FloatingLabelInput from "@/components/ui/FloatingLabelInput";
import { useCreateUser } from "@/api/generated/users/users";
import { useLogin } from "@/api/generated/auth/auth";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [errors, setErrors] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const { mutate: performLogin } = useLogin({
        mutation: {
            onSuccess: () => {
                toast.success("¡Bienvenido a bordo!");
                navigate("/");
            },
            onError: () => {
                toast.error("Has sido registrado pero ha habido un error al iniciar sesión automaticamente, por favor inicia sesión manualmente.");
            }
        }
    });

    const { mutate: performRegister, isPending } = useCreateUser({
        mutation: {
            onSuccess: () => {
                performLogin({
                    data: {
                        identifier: formData.email,
                        password: formData.password,
                        responseType: 'cookie'
                    }
                });
            },
            onError: (error) => {
                switch (error.code) {
                    case "REQUEST_VALIDATION_ERROR":
                        const newErrors = {
                            username: error.details["body.username"]?.message || "",
                            email: error.details["body.email"]?.message || "",
                            password: error.details["body.password"]?.message || "",
                            confirmPassword: error.details["body.password"]?.message || "",
                        }
                        setErrors(newErrors);
                        break;
                    case "CONFLICT":
                        switch (error.details.field) {
                            case "username":
                                toast.error(`El nombre de usuario "${formData.username}" ya está en uso`);
                                break;
                            case "email":
                                toast.error(`El email "${formData.email}" ya está en uso`);
                                break;
                        }
                        break;
                    case "DATABASE_VALIDATION_ERROR":
                        toast.error(error.message);
                        break;
                }
            }
        }
    });

    const register = () => { // TODO Mejorar validacion
        const newErrors = {
            username: !formData.username ? "El nombre de usuario es obligatorio" : "",
            email: !formData.email ? "El email es obligatorio" : "",
            password: !formData.password ? "La contraseña es obligatoria" : "",
            confirmPassword: !formData.confirmPassword ? "La confirmación de la contraseña es obligatoria" : formData.password !== formData.confirmPassword ? "Las contraseñas no coinciden" : ""
        };
        setErrors(newErrors);

        if (newErrors.username || newErrors.email || newErrors.password || newErrors.confirmPassword) {
            toast.error("Por favor completa todos los campos correctamente");
            return;
        }

        performRegister({
            data: {
                username: formData.username,
                email: formData.email,
                password: formData.password
            }
        });
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const enterKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            register();
        }
    };

    return (
        <AuthLayout>
            <AuthCard title="Únete a flAIghts">
                <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5">

                    <FloatingLabelInput
                        value={formData.username}
                        onChange={handleChange}
                        type="text"
                        id="username"
                        name="username"
                        label="Nombre de usuario"
                        error={errors.username}
                        onKeyDown={enterKeyPress}
                    />

                    <FloatingLabelInput
                        value={formData.email}
                        onChange={handleChange}
                        type="email"
                        id="email"
                        name="email"
                        label="Email"
                        error={errors.email}
                        onKeyDown={enterKeyPress}
                    />

                    <FloatingLabelInput
                        value={formData.password}
                        onChange={handleChange}
                        type="password"
                        id="password"
                        name="password"
                        label="Contraseña"
                        error={errors.password}
                        onKeyDown={enterKeyPress}
                    />

                    <FloatingLabelInput
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        label="Confirmar contraseña"
                        error={errors.confirmPassword}
                        onKeyDown={enterKeyPress}
                    />

                    <button
                        type="button"
                        onClick={register}
                        disabled={isPending}
                        className="mt-4 rounded-lg bg-accent p-3 text-on-accent font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        {isPending ? "Registrando..." : "Crear cuenta"}
                    </button>

                    <span className="text-sm text-primary text-center">
                        ¿Ya tienes cuenta? <a href="/login" className="text-accent font-bold hover:underline">Inicia sesión</a>
                    </span>
                </form>
            </AuthCard>
        </AuthLayout>
    )
}