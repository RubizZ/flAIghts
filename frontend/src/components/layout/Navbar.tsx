import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Dropdown from "@/components/ui/Dropdown";
import {
    User,
    Settings,
    LogOut,
    ChevronDown,
    MoreHorizontal,
    Sun,
    Moon,
    Monitor,
    Palette,
    ShieldCheck
} from "lucide-react";

export default function Navbar() {
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const { theme, setTheme } = useTheme();

    // Estados para los menús
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [isThemeSubmenuOpen, setIsThemeSubmenuOpen] = useState(false);

    const themeIcons = {
        light: <Sun size={14} />,
        dark: <Moon size={14} />,
        system: <Monitor size={14} />
    };

    const themeLabels = {
        light: 'Claro',
        dark: 'Oscuro',
        system: 'Sistema'
    };

    return (
        <nav className="flex justify-center bg-primary h-16 py-2 px-4 shadow-sm border-b border-themed relative z-50">
            <div className="flex flex-1 items-center justify-start gap-4">
                <Link to="/" className="cursor-pointer text-primary hover:text-accent transition-colors font-medium">Explore</Link>
            </div>

            <div className="flex flex-1 items-center justify-center">
                <span className="text-secondary font-bold text-xl tracking-tighter">flAIghts</span>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2">
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-8 bg-secondary rounded-full animate-pulse opacity-50" />
                        <div className="w-20 h-8 bg-secondary rounded-full animate-pulse opacity-50" />
                        <div className="w-9 h-9 bg-secondary rounded-full animate-pulse opacity-50" />
                    </div>
                ) : isAuthenticated ? (
                    <Dropdown
                        isOpen={isUserMenuOpen}
                        onOpenChange={(open) => {
                            setIsUserMenuOpen(open);
                            if (open) {
                                setIsOptionsMenuOpen(false);
                                setIsThemeSubmenuOpen(false);
                            }
                        }}
                        trigger={
                            <div className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-themed p-1 pr-3 rounded-full transition-all group">
                                {
                                    true ? ( // TODO Implementar avatar
                                        <img
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                                            className="w-7 h-7 rounded-full shadow-inner bg-secondary border border-themed"
                                            alt="Avatar"
                                        />
                                    ) : (
                                        <User size={16} />
                                    )
                                }
                                <span className="text-primary text-sm font-bold hidden sm:block max-w-24 truncate">
                                    {user?.username}
                                </span>
                                <ChevronDown size={14} className={`text-secondary opacity-60 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                            </div>
                        }
                    >
                        {!isThemeSubmenuOpen ? (
                            <>
                                <div className="p-3 border-b border-themed bg-secondary/50">
                                    <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 opacity-50">Cuenta</p>
                                    <p className="text-sm font-bold text-primary truncate">{user?.email}</p>
                                </div>
                                <div className="p-1">
                                    <button onClick={() => { setIsUserMenuOpen(false); navigate(`/user/${user?.id}`) }} className="w-full flex items-center justify-between text-secondary px-3 py-2 text-sm rounded-xl transition-all group text-left hover:bg-(--color-bg-secondary)/70 hover:cursor-pointer font-medium">
                                        <div className="flex items-center gap-3">
                                            <User size={16} className="shrink-0" />
                                            <span className="leading-none">Mi Perfil</span>
                                        </div>
                                    </button>
                                    <button className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all cursor-not-allowed group text-left">
                                        <div className="flex items-center gap-3 opacity-20 text-primary">
                                            <Settings size={16} />
                                            Ajustes
                                        </div>
                                        <span className="text-[8px] bg-secondary/10 px-1.5 py-0.5 rounded uppercase tracking-tighter opacity-20 text-primary">Soon</span>
                                    </button>
                                    {user?.role === 'admin' && (
                                        <button className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all cursor-not-allowed group text-left">
                                            <div className="flex items-center gap-3 opacity-20 text-amber-500">
                                                <ShieldCheck size={16} />
                                                Panel Admin
                                            </div>
                                            <span className="text-[8px] bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter opacity-20 text-amber-500">Soon</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsThemeSubmenuOpen(true);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-secondary hover:bg-(--color-bg-secondary)/70 rounded-xl transition-all cursor-pointer group text-left font-medium"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Palette size={16} className="shrink-0" />
                                            <span className="leading-none">Tema</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-secondary opacity-60 font-bold transition-colors">
                                            <span className="leading-none">{themeLabels[theme as keyof typeof themeLabels]}</span>
                                            <ChevronDown size={12} className="-rotate-90 group-hover:rotate-0 transition-transform shrink-0" />
                                        </div>
                                    </button>
                                </div>
                                <div className="p-1 border-t border-themed">
                                    <button
                                        onClick={() => {
                                            setIsUserMenuOpen(false);
                                            logout();
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer text-left font-bold"
                                    >
                                        <LogOut size={16} />
                                        Cerrar sesión
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col p-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsThemeSubmenuOpen(false);
                                    }}
                                    className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-primary font-bold hover:text-accent transition-colors flex items-center gap-2 cursor-pointer w-full text-left"
                                >
                                    <ChevronDown size={12} className="rotate-90" />
                                    Volver
                                </button>
                                {(['light', 'dark', 'system'] as const).map((t) => (
                                    <button
                                        key={t}
                                        disabled={t === 'system'}
                                        onClick={() => {
                                            if (t !== 'system') {
                                                setTheme(t as any);
                                                setIsUserMenuOpen(false);
                                                setIsThemeSubmenuOpen(false);
                                            }
                                        }}
                                        className={`flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all group w-full ${t === 'system'
                                            ? 'opacity-20 cursor-not-allowed grayscale'
                                            : theme === t
                                                ? 'bg-accent/10 text-accent cursor-pointer font-bold'
                                                : 'text-primary hover:bg-secondary cursor-pointer'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {(themeIcons as any)[t]}
                                            {(themeLabels as any)[t]}
                                            {t === 'system' && (
                                                <span className="text-[8px] bg-secondary/10 px-1 rounded uppercase tracking-tighter">Soon</span>
                                            )}
                                        </div>
                                        {t !== 'system' && theme === t && <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </Dropdown>
                ) : (
                    <div className="flex gap-2">
                        <Link to="/login" className="bg-secondary text-primary hover:bg-secondary/80 px-5 py-1.5 rounded-full transition-colors cursor-pointer font-medium text-sm">Log in</Link>
                        <Link to="/register" className="bg-accent text-on-accent hover:bg-accent-hover px-5 py-1.5 rounded-full transition-colors cursor-pointer font-medium text-sm text-center">Register</Link>
                    </div>
                )}

                {/* More Options Menu - Solo visible si NO está autenticado y NO está cargando */}
                {!isLoading && !isAuthenticated && (
                    <Dropdown
                        isOpen={isOptionsMenuOpen}
                        onOpenChange={(open) => {
                            setIsOptionsMenuOpen(open);
                            if (open) {
                                setIsUserMenuOpen(false);
                                setIsThemeSubmenuOpen(false);
                            }
                        }}
                        trigger={
                            <div className="w-9 h-9 flex items-center justify-center bg-secondary hover:bg-secondary/80 border border-themed rounded-full text-primary transition-all active:scale-90">
                                <MoreHorizontal size={20} />
                            </div>
                        }
                    >
                        <div className="p-1">
                            {!isThemeSubmenuOpen ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsThemeSubmenuOpen(true);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-secondary rounded-xl transition-colors cursor-pointer group text-left font-medium"
                                >
                                    <div className="flex items-center gap-3">
                                        <Palette size={16} className="group-hover:text-accent transition-colors" />
                                        Tema
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-secondary opacity-60 font-bold">
                                        {themeLabels[theme as keyof typeof themeLabels]}
                                        <ChevronDown size={12} className="-rotate-90" />
                                    </div>
                                </button>
                            ) : (
                                <div className="flex flex-col">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsThemeSubmenuOpen(false);
                                        }}
                                        className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-secondary font-bold hover:text-accent transition-colors flex items-center gap-2 cursor-pointer"
                                    >
                                        <ChevronDown size={12} className="rotate-90" />
                                        Volver
                                    </button>
                                    {(['light', 'dark', 'system'] as const).map((t) => (
                                        <button
                                            key={t}
                                            disabled={t === 'system'}
                                            onClick={() => {
                                                if (t !== 'system') {
                                                    setTheme(t as any);
                                                    setIsOptionsMenuOpen(false);
                                                    setIsThemeSubmenuOpen(false);
                                                }
                                            }}
                                            className={`flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-colors group ${t === 'system'
                                                ? 'opacity-30 cursor-not-allowed grayscale'
                                                : theme === t
                                                    ? 'bg-accent/10 text-accent cursor-pointer'
                                                    : 'text-secondary hover:text-primary hover:bg-secondary cursor-pointer'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {(themeIcons as any)[t]}
                                                {(themeLabels as any)[t]}
                                                {t === 'system' && (
                                                    <span className="text-[8px] bg-secondary/10 px-1 rounded uppercase tracking-tighter">Soon</span>
                                                )}
                                            </div>
                                            {t !== 'system' && theme === t && <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Dropdown>
                )}
            </div>
        </nav>
    );
}
