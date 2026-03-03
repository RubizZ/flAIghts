import { useForgotPassword } from "@/api/generated/auth/auth";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthCard from "@/components/ui/AuthCard";
import FloatingLabelInput from "@/components/ui/FloatingLabelInput";
import { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";

export default function ForgotPassword(): JSX.Element {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const { mutate: forgotPassword, isPending } = useForgotPassword({
        mutation: {
            onSuccess: () => {
                toast.success('Se ha enviado un correo con un enlace para restablecer tu contraseña');
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
                        toast.error('Error desconocido al enviar el correo');
                        break;
                    }
                }
            }
        }
    })

    const handleSubmit = () => {
        if (!email) {
            setError('El email es obligatorio');
            return;
        }

        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            setError('El email es invalido');
            return;
        }

        forgotPassword({ data: { email } });
    }

    return (
        <AuthLayout>
            <AuthCard title="Forgot Password">
                <form action="" className="flex flex-col gap-4">
                    <p className="text-center text-secondary text-sm text-muted-foreground">
                        Escribe tu email y te enviaremos un enlace para restablecer tu contraseña.
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
                    <button disabled={isPending} onClick={handleSubmit} type="button" className="mt-2 rounded-lg bg-accent p-3 text-on-accent font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
                        {isPending ? 'Enviando...' : 'Enviar'}
                    </button>
                </form>
            </AuthCard>
        </AuthLayout>
    )
}