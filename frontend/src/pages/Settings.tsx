import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUpdateUser, getGetSelfUserQueryKey, useInitiateEmailChange, useCompleteEmailChange, useCancelEmailChange, getGetUserByIdQueryKey, useSetProfilePicture } from "@/api/generated/users/users";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    User,
    Lock,
    Globe,
    Sliders,
    Sun,
    Moon,
    LogOut,
    AlertCircle,
    ArrowLeft,
    Shield,
    Eye,
    EyeOff,
    Mail,
    ShieldCheck,
    Camera,
    Upload
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useChangePassword } from "@/api/generated/auth/auth";
import UserAvatar from "@/components/ui/UserAvatar";

export default function Settings() {
    const { user, logout, refetch, isAuthenticated, isLoading } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const activeTab = searchParams.get("tab") || "perfil";

    const setActiveTab = (tab: string) => {
        setSearchParams({ tab });
    };

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate("/login");
        }
    }, [isAuthenticated, isLoading, navigate]);

    const [username, setUsername] = useState(user?.username || "");
    const [email, setEmail] = useState(user?.email || "");
    const [isPublic, setIsPublic] = useState(user?.public || false);

    // Preferences weights
    const [priceWeight, setPriceWeight] = useState(user?.preferences?.price_weight || 0.4);
    const [durationWeight, setDurationWeight] = useState(user?.preferences?.duration_weight || 0.2);
    const [stopsWeight, setStopsWeight] = useState(user?.preferences?.stops_weight || 0.2);
    const [airlineWeight, setAirlineWeight] = useState(user?.preferences?.airline_quality_weight || 0.2);

    // Security state
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPasswords, setShowPasswords] = useState(false);

    // Email change verification state
    const [oldEmailCode, setOldEmailCode] = useState("");
    const [newEmailCode, setNewEmailCode] = useState("");
    useEffect(() => {
        if (user?.pending_email && activeTab === 'seguridad') {
            toast.info("Tienes un cambio de email pendiente de verificación", {
                id: "pending-email-toast"
            });
        }
    }, [user?.pending_email, activeTab]);

    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setEmail(user.email);
            setIsPublic(user.public);
            setPriceWeight(user.preferences?.price_weight);
            setDurationWeight(user.preferences?.duration_weight);
            setStopsWeight(user.preferences?.stops_weight);
            setAirlineWeight(user.preferences?.airline_quality_weight);
        }
    }, [user]);

    const { mutate: updateProfile, isPending: isUpdating } = useUpdateUser({
        mutation: {
            onSuccess: () => {
                toast.success("Perfil actualizado con éxito");
                queryClient.invalidateQueries({ queryKey: getGetSelfUserQueryKey() });
                if (user?._id) {
                    queryClient.invalidateQueries({ queryKey: getGetUserByIdQueryKey(user._id) });
                }
                refetch();
            },
            onError: (error) => {
                toast.error(error.message || "Error al actualizar el perfil");
            }
        }
    });

    const { mutate: initiateEmailChange, isPending: isInitiatingEmailChange } = useInitiateEmailChange({
        mutation: {
            onSuccess: () => {
                toast.success("Solicitud de cambio de email iniciada. Introduce los códigos enviados.");
                queryClient.invalidateQueries({ queryKey: getGetSelfUserQueryKey() });
                refetch();
            },
            onError: (error) => {
                if (error.code === "EMAIL_ALREADY_IN_USE") {
                    toast.error("El nuevo email ya está en uso");
                } else if (error.code === "REQUEST_VALIDATION_ERROR") {
                    toast.error("El nuevo email es invalido");
                }
            }
        }
    });

    const { mutate: completeEmailChange, isPending: isCompletingEmailChange } = useCompleteEmailChange({
        mutation: {
            onSuccess: () => {
                toast.success("Email actualizado correctamente");
                setOldEmailCode("");
                setNewEmailCode("");
                queryClient.invalidateQueries({ queryKey: getGetSelfUserQueryKey() });
                if (user?._id) {
                    queryClient.invalidateQueries({ queryKey: getGetUserByIdQueryKey(user._id) });
                }
                refetch();
            },
            onError: (error) => {
                if (error.code === "EMAIL_VERIFICATION_CODE_INVALID_OR_EXPIRED") {
                    toast.error("Uno o ambos códigos son inválidos o han expirado");
                } else {
                    toast.error(error.message || "Error al completar el cambio de email");
                }
            }
        }
    });

    const { mutate: cancelEmailChange, isPending: isCancellingEmailChange } = useCancelEmailChange({
        mutation: {
            onSuccess: () => {
                toast.success("Cambio de email cancelado");
                setOldEmailCode("");
                setNewEmailCode("");
                setEmail(user?.email ?? "");
                queryClient.invalidateQueries({ queryKey: getGetSelfUserQueryKey() });
                refetch();
            },
            onError: (error) => {
                toast.error(error.message || "Error al cancelar el cambio de email");
            }
        }
    });

    const { mutate: changePassword, isPending: isChangingPassword } = useChangePassword({
        mutation: {
            onSuccess: () => {
                toast.success("Contraseña actualizada con éxito");
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");
            },
            onError: (error) => {
                toast.error(error.message || "Error al cambiar la contraseña");
            }
        }
    });

    const { mutate: uploadAvatar, isPending: isUploadingAvatar } = useSetProfilePicture({
        mutation: {
            onSuccess: () => {
                toast.success("Foto de perfil actualizada correctamente");
                queryClient.invalidateQueries({ queryKey: getGetSelfUserQueryKey() });
                if (user?._id) {
                    queryClient.invalidateQueries({ queryKey: getGetUserByIdQueryKey(user._id) });
                }
                refetch();
            },
            onError: (error) => {
                toast.error(error.message || "Error al subir la imagen");
            }
        }
    });


    const hasProfileChanged = user ? (username !== user.username || isPublic !== user.public) : false;
    const hasPreferencesChanged = user ? (
        priceWeight !== user.preferences?.price_weight ||
        durationWeight !== user.preferences?.duration_weight ||
        stopsWeight !== user.preferences?.stops_weight ||
        airlineWeight !== user.preferences?.airline_quality_weight
    ) : false;

    const handleSaveProfile = () => {
        if (!user) return;

        updateProfile({
            data: {
                username,
                public: isPublic,
                preferences: {
                    price_weight: priceWeight,
                    duration_weight: durationWeight,
                    stops_weight: stopsWeight,
                    airline_quality_weight: airlineWeight
                }
            }
        });
    };

    const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limite de 5MB
        if (file.size > 5 * 1024 * 1024) {
            toast.error("La imagen es demasiado grande (máx. 5MB)");
            return;
        }

        uploadAvatar({
            data: file
        });
    };

    const handleVerifyEmailChange = () => {
        if (!oldEmailCode || !newEmailCode) {
            toast.error("Por favor, introduce ambos códigos");
            return;
        }
        completeEmailChange({
            data: {
                oldEmailCode,
                newEmailCode
            }
        });
    };

    const handleWeightChange = (setter: (val: number) => void, value: string) => {
        const num = parseFloat(value);
        if (!isNaN(num)) {
            setter(num);
        }
    };

    const handleSavePassword = () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            toast.error("Por favor, rellena todos los campos");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Las contraseñas nuevas no coinciden");
            return;
        }
        if (newPassword === oldPassword) {
            toast.error("La nueva contraseña debe ser diferente a la actual");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("La nueva contraseña debe tener al menos 8 caracteres");
            return;
        }

        changePassword({
            data: {
                oldPassword,
                newPassword
            }
        });
    };

    if (isLoading || !user) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'perfil', label: 'Perfil', icon: User },
        { id: 'preferencias', label: 'Preferencias', icon: Sliders },
        { id: 'seguridad', label: 'Seguridad', icon: Shield },
        { id: 'apariencia', label: 'Apariencia', icon: Sun },
    ] as const;

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full cursor-pointer group"
                >
                    <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <h1 className="text-3xl font-bold text-content">Ajustes</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Sidebar Nav */}
                <aside className="md:col-span-1">
                    <div className="md:sticky md:top-24 h-fit z-10 p-4 bg-main border border-line rounded-3xl shadow-sm">
                        <div className="flex flex-col items-center text-center gap-4 mb-6">
                            <UserAvatar user={user} size={96} className="border-4 border-line shadow-sm bg-surface" />
                            <div>
                                <h2 className="font-bold text-xl">{user.username}</h2>
                                <p className="text-sm text-content-muted opacity-70">{user.email}</p>
                            </div>
                        </div>

                        <nav className="flex flex-col gap-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 p-3 rounded-2xl font-bold transition-all cursor-pointer ${activeTab === tab.id
                                        ? 'bg-brand/10 text-brand'
                                        : 'bg-main text-content-muted font-medium'
                                        }`}
                                >
                                    <div className="relative">
                                        <tab.icon size={18} />
                                        {tab.id === 'seguridad' && user.pending_email && (
                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand border-2 border-white dark:border-slate-900 rounded-full animate-pulse shadow-sm" />
                                        )}
                                    </div>
                                    {tab.label}
                                </button>
                            ))}
                        </nav>

                        <div className="mt-8 pt-4 border-t border-line">
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-bold cursor-pointer"
                            >
                                <LogOut size={18} /> Cerrar sesión
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="md:col-span-2 flex flex-col gap-8 min-h-[60vh]">
                    {/* Seccion Perfil */}
                    {activeTab === 'perfil' && (
                        <>
                            <section className="bg-main border border-line rounded-3xl shadow-sm p-6 sm:p-8 animate-fade-in animate-duration-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-brand/10 text-brand rounded-xl">
                                        <User size={20} />
                                    </div>
                                    <h2 className="text-xl font-bold">Información del Perfil</h2>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex flex-col items-center sm:flex-row gap-6 p-6 bg-surface/30 rounded-3xl border border-line mb-6">
                                        <div className="relative group">
                                            <UserAvatar user={user} size={100} className="border-4 border-line shadow-md" />
                                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                <Camera size={24} />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleAvatarFileChange}
                                                    disabled={isUploadingAvatar}
                                                />
                                            </label>
                                            {isUploadingAvatar && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2 text-center sm:text-left">
                                            <h3 className="font-bold text-lg">Tu foto de perfil</h3>
                                            <p className="text-xs text-content-muted opacity-70 mb-2">Máximo 5MB.</p>
                                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                                <label className="px-4 py-2 bg-brand text-content-on-brand rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer flex items-center gap-2">
                                                    <Upload size={14} /> Seleccionar nueva foto
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleAvatarFileChange}
                                                        disabled={isUploadingAvatar}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-content-muted ml-1">Nombre de usuario</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    className="w-full px-4 py-3 bg-main border border-line rounded-2xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all pl-11"
                                                    placeholder="Tu nombre de usuario"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted opacity-50">
                                                    <User size={18} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 mt-6 border-t border-line space-y-3">
                                    <label className="text-sm font-bold text-content-muted ml-1 block">Visibilidad del perfil</label>
                                    <div className="flex items-center justify-between p-4 bg-surface/50 rounded-2xl border border-line">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-full ${isPublic ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                                {isPublic ? <Globe size={20} /> : <Lock size={20} />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold">{isPublic ? "Perfil Público" : "Perfil Privado"}</h3>
                                                <p className="text-xs text-content-muted opacity-70">
                                                    {isPublic
                                                        ? "Otros usuarios pueden ver tus búsquedas recientes y estadísticas."
                                                        : "Tus búsquedas y estadísticas son totalmente privadas."}
                                                </p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={isPublic}
                                                onChange={(e) => setIsPublic(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-line after:border after:rounded-full after:h-5 after:w-5 peer-checked:bg-brand"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={isUpdating || !hasProfileChanged}
                                        className="px-6 py-3 bg-brand text-content-on-brand rounded-2xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                                    >
                                        {isUpdating ? "Guardando..." : "Guardar cambios del perfil"}
                                    </button>
                                </div>
                            </section>


                        </>
                    )}

                    {/* Seccion Preferencias de Vuelos */}
                    {activeTab === 'preferencias' && (
                        <section className="bg-main border border-line rounded-3xl shadow-sm p-6 sm:p-8 animate-fade-in animate-duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-brand/10 text-brand rounded-xl">
                                        <Sliders size={20} />
                                    </div>
                                    <h2 className="text-xl font-bold">Pesos de búsqueda</h2>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4 mb-8 border-b border-line pb-6">
                                <p className="text-sm text-content-muted opacity-70">
                                    Ajusta el nivel de importancia de los factores al buscar vuelos.
                                </p>
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-bold text-amber-500">¿Cómo ajustar los pesos?</p>
                                        <p className="text-xs text-content-muted opacity-80 leading-relaxed">
                                            Ten en cuenta que si le das mucha más importancia a uno de los campos, debes representarlo correctamente en relación a los demás. Es decir, si te importa que el vuelo sea corto, pero te importa <strong>mucho más</strong> que el precio sea barato, no pongas la duración a 1, déjala en un valor menor para que el algoritmo priorice el precio.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {[
                                    {
                                        label: "Precio",
                                        value: priceWeight,
                                        setter: setPriceWeight,
                                        icon: "€",
                                        getDescription: (v: number) => {
                                            if (v === 0) return "El precio me es indiferente";
                                            if (v < 0.3) return "Pagaría más por un mejor vuelo";
                                            if (v < 0.7) return "Busco un equilibrio razonable en el precio";
                                            if (v < 1) return "Suelo priorizar que el precio sea bajo";
                                            return "Cuanto más barato mejor";
                                        }
                                    },
                                    {
                                        label: "Duración",
                                        value: durationWeight,
                                        setter: setDurationWeight,
                                        icon: "⏱️",
                                        getDescription: (v: number) => {
                                            if (v === 0) return "El tiempo de viaje me es indiferente";
                                            if (v < 0.3) return "No me importa si el vuelo dura más";
                                            if (v < 0.7) return "Prefiero no estar demasiadas horas de viaje";
                                            if (v < 1) return "Intento llegar lo antes posible a mi destino";
                                            return "Quiero el vuelo más rápido posible";
                                        }
                                    },
                                    {
                                        label: "Escalas",
                                        value: stopsWeight,
                                        setter: setStopsWeight,
                                        icon: "✈️",
                                        getDescription: (v: number) => {
                                            if (v === 0) return "Me da igual hacer muchas escalas";
                                            if (v < 0.3) return "Hacer varias paradas no me supone un problema";
                                            if (v < 0.7) return "Prefiero rutas con pocas escalas si es posible";
                                            if (v < 1) return "Intento evitar hacer transbordos";
                                            return "Busco vuelos directos sin paradas";
                                        }
                                    },
                                    {
                                        label: "Calidad Aerolínea",
                                        value: airlineWeight,
                                        setter: setAirlineWeight,
                                        icon: "⭐",
                                        getDescription: (v: number) => {
                                            if (v === 0) return "Me da igual con qué aerolínea volar";
                                            if (v < 0.3) return "Me adapto a aerolíneas de bajo coste sin problema";
                                            if (v < 0.7) return "Valoro un servicio aceptable a bordo";
                                            if (v < 1) return "Prefiero aerolíneas tradicionales y cómodas";
                                            return "Busco siempre las aerolíneas mejor valoradas";
                                        }
                                    },
                                ].map((item) => (
                                    <div key={item.label} className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{item.icon}</span>
                                                <label className="font-bold text-content">{item.label}</label>
                                            </div>
                                            <span className="bg-surface px-3 py-1 rounded-lg border border-line font-mono font-bold text-brand">
                                                {item.value.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="relative flex flex-col gap-2">
                                            <div className="w-full flex items-center">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.05"
                                                    value={item.value}
                                                    onChange={(e) => handleWeightChange(item.setter, e.target.value)}
                                                    className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-brand border border-line relative z-10"
                                                />
                                            </div>
                                            <p className="text-xs text-content-muted opacity-80 h-4 font-medium">
                                                {item.getDescription(item.value)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex justify-end flex-wrap gap-2 relative group">
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isUpdating || !hasPreferencesChanged}
                                    className="px-6 py-3 bg-brand text-content-on-brand rounded-2xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                                >
                                    {isUpdating ? "Guardando..." : "Guardar preferencias"}
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Seccion Seguridad */}
                    {activeTab === 'seguridad' && (
                        <div className="flex flex-col gap-8">
                            <section className="bg-main border border-line rounded-3xl shadow-sm p-6 sm:p-8 animate-fade-in animate-duration-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-brand/10 text-brand rounded-xl">
                                        <Mail size={20} />
                                    </div>
                                    <h2 className="text-xl font-bold">Dirección de correo electrónico</h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-content-muted opacity-70 ml-1">Utilizamos este correo principal para identificarte y para enviarte notificaciones.</p>
                                    </div>

                                    {!user.pending_email ? (
                                        <div className="flex flex-col gap-3">
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full px-4 py-3 bg-main border border-line rounded-2xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all pl-11"
                                                    placeholder="tu@email.com"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted opacity-50 pointer-events-none">
                                                    <Mail size={18} />
                                                </div>
                                            </div>
                                            <div className="mt-2 flex justify-end flex-wrap gap-2 animate-fade-in">
                                                <button
                                                    type="button"
                                                    onClick={() => initiateEmailChange({ data: { newEmail: email } })}
                                                    disabled={isInitiatingEmailChange || email.toLowerCase() === user.email.toLowerCase()}
                                                    className="px-6 py-3 bg-brand text-content-on-brand rounded-2xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                                                >
                                                    {isInitiatingEmailChange ? "Actualizando..." : "Actualizar correo electrónico"}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-brand/5 border border-line rounded-2xl flex flex-col gap-4 animate-fade-in">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="text-brand shrink-0 mt-0.5" size={18} />
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-sm font-bold text-brand">Cambio de email pendiente</p>
                                                    <p className="text-xs text-content-muted opacity-80 leading-relaxed">
                                                        Hemos enviado códigos a tu email actual (<span className="font-bold">{user.email}</span>)
                                                        y al nuevo (<span className="font-bold">{user.pending_email}</span>).
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] uppercase font-bold text-content-muted/70 ml-1">Código email actual</label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={oldEmailCode}
                                                            onChange={(e) => setOldEmailCode(e.target.value)}
                                                            placeholder="000000"
                                                            className="w-full px-3 py-2 text-sm bg-main border border-line rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all pl-9"
                                                        />
                                                        <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted/50 pointer-events-none" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] uppercase font-bold text-content-muted/70 ml-1">Código nuevo email</label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={newEmailCode}
                                                            onChange={(e) => setNewEmailCode(e.target.value)}
                                                            placeholder="000000"
                                                            className="w-full px-3 py-2 text-sm bg-main border border-line rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all pl-9"
                                                        />
                                                        <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted/50 pointer-events-none" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleVerifyEmailChange}
                                                    disabled={isCompletingEmailChange || isCancellingEmailChange}
                                                    className="flex-1 py-2 bg-brand text-content-on-brand rounded-xl text-xs font-bold hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                                                >
                                                    {isCompletingEmailChange ? "Verificando..." : "Confirmar cambio"}
                                                </button>
                                                <button
                                                    onClick={() => cancelEmailChange()}
                                                    disabled={isCancellingEmailChange || isCompletingEmailChange}
                                                    className="py-2 px-4 bg-surface border border-line text-content-muted rounded-xl text-xs font-bold hover:border-red-400 hover:text-red-500 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                                                >
                                                    {isCancellingEmailChange ? "Cancelando..." : "Cancelar"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="bg-main border border-line rounded-3xl shadow-sm p-6 sm:p-8 animate-fade-in animate-duration-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-brand/10 text-brand rounded-xl">
                                        <Shield size={20} />
                                    </div>
                                    <h2 className="text-xl font-bold">Contraseña</h2>
                                </div>

                                <p className="text-sm text-content-muted mb-8 opacity-70 border-b border-line pb-4">
                                    Cambia tu contraseña periódicamente para mantener tu cuenta segura.
                                </p>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-content-muted ml-1">Contraseña actual</label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords ? "text" : "password"}
                                                value={oldPassword}
                                                onChange={(e) => setOldPassword(e.target.value)}
                                                className="w-full px-4 py-3 bg-main border border-line rounded-2xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all pl-11"
                                                placeholder="••••••••"
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted opacity-50 pointer-events-none">
                                                <Lock size={18} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-content-muted ml-1">Nueva contraseña</label>
                                            <div className="relative">
                                                <input
                                                    type={showPasswords ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full px-4 py-3 bg-main border border-line rounded-2xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all pl-11"
                                                    placeholder="••••••••"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted opacity-50 pointer-events-none">
                                                    <Shield size={18} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-content-muted ml-1">Confirmar nueva contraseña</label>
                                            <div className="relative">
                                                <input
                                                    type={showPasswords ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full px-4 py-3 bg-main border border-line rounded-2xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all pl-11"
                                                    placeholder="••••••••"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted opacity-50 pointer-events-none">
                                                    <Shield size={18} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(!showPasswords)}
                                            className="text-xs font-bold text-brand hover:underline flex items-center gap-2 cursor-pointer"
                                        >
                                            {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                                            {showPasswords ? "Ocultar contraseñas" : "Mostrar contraseñas"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => navigate("/forgot-password")}
                                            className="text-xs font-bold text-content-muted hover:text-brand transition-colors underline decoration-dotted underline-offset-4 cursor-pointer"
                                        >
                                            ¿Has olvidado tu contraseña?
                                        </button>
                                    </div>

                                    <div className="mt-4 p-4 bg-brand/5 rounded-2xl border border-line">
                                        <h4 className="text-xs font-bold text-brand uppercase tracking-wider mb-2">Requisitos:</h4>
                                        <ul className="text-xs text-content-muted space-y-1 list-disc ml-4 opacity-80">
                                            <li>Mínimo 8 caracteres</li>
                                            <li>Debe ser diferente a la actual</li>
                                            <li>Recomendamos incluir números y símbolos</li>
                                        </ul>
                                    </div>

                                    <div className="mt-6 flex justify-end flex-wrap gap-2">
                                        <button
                                            onClick={handleSavePassword}
                                            disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                                            className="px-6 py-3 bg-brand text-content-on-brand rounded-2xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                                        >
                                            {isChangingPassword ? "Actualizando..." : "Actualizar contraseña"}
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Seccion Apariencia */}
                    {activeTab === 'apariencia' && (
                        <section className="bg-main border border-line rounded-3xl shadow-sm p-6 sm:p-8 animate-fade-in animate-duration-300">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-brand/10 text-brand rounded-xl">
                                    <Sun size={20} />
                                </div>
                                <h2 className="text-xl font-bold">Apariencia</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all hover:scale-[1.02] cursor-pointer ${theme === 'light' ? 'border-brand bg-brand' : 'border-line bg-surface hover:bg-surface/80'}`}
                                >
                                    <div className="p-4 bg-white rounded-full shadow-md text-orange-500">
                                        <Sun size={32} />
                                    </div>
                                    <span className={`font-bold ${theme === 'light' ? 'text-content-on-brand' : 'text-content'}`}>Modo Claro</span>
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all hover:scale-[1.02] cursor-pointer ${theme === 'dark' ? 'border-brand bg-brand' : 'border-line bg-surface hover:bg-surface/80'}`}
                                >
                                    <div className="p-4 bg-slate-900 rounded-full shadow-md text-blue-400">
                                        <Moon size={32} />
                                    </div>
                                    <span className={`font-bold ${theme === 'dark' ? 'text-content-on-brand' : 'text-content'}`}>Modo Oscuro</span>
                                </button>
                                <button
                                    onClick={() => setTheme('system')}
                                    className={`flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all hover:scale-[1.02] cursor-pointer ${theme === 'system' ? 'border-brand bg-brand' : 'border-line bg-surface hover:bg-surface/80'}`}
                                >
                                    <div className="p-4 bg-main rounded-full shadow-md text-brand">
                                        <Sliders size={32} />
                                    </div>
                                    <span className={`font-bold ${theme === 'system' ? 'text-content-on-brand' : 'text-content'}`}>Sistema</span>
                                </button>
                            </div>
                        </section>
                    )}

                </div>
            </div >
        </div >
    );
}
