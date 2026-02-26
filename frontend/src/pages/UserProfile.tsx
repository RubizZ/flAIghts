import { useGetUserById } from "@/api/generated/users/users";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export default function UserProfile() {
    const { id } = useParams();
    const navigate = useNavigate();

    if (!id) {
        throw new Error("User ID is required");
    }

    const { data, isLoading, isError, error } = useGetUserById(id, {
        query: {
            enabled: !!id,
        },
    });

    useEffect(() => {
        if (isError && error?.code !== "NOT_FOUND") {
            toast.error("Inicia sesión para ver este perfil");
            navigate("/login");
        }
    }, [isError, error, navigate]);

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (isError && error?.code === "NOT_FOUND") {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-6 animate-in fade-in zoom-in duration-500">
                <div className="p-4 bg-red-50 rounded-full border border-red-100">
                    <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div className="text-center gap-2 flex flex-col">
                    <h1 className="text-3xl font-bold text-primary">Usuario no encontrado</h1>
                    <p className="text-secondary max-w-sm">
                        Lo sentimos, el perfil con ID <span className="font-mono font-bold text-red-500">{id}</span> no pudo ser localizado.
                    </p>
                </div>
                <button
                    onClick={() => navigate("/")}
                    className="px-8 py-3 bg-accent text-on-accent rounded-full hover:bg-accent-hover transition-all shadow-xl active:scale-95"
                >
                    Volver al inicio
                </button>
            </div>
        );
    }

    if (isError || data === undefined) return null;

    return (
        <div className="flex p-8 justify-center">
            <div className="flex flex-col text-center gap-4 bg-primary p-8 rounded-3xl border border-themed shadow-sm">
                <img className="w-64 h-64 rounded-full border-4 border-themed p-1" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${data.id}`} alt="" />
                <div>
                    <h1 className="text-3xl font-bold text-primary">{data.username}</h1>
                    <p className="text-secondary text-sm">Miembro desde {new Date(data.created_at).toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
}