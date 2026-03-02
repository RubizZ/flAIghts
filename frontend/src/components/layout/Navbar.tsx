import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Theme, useTheme } from "@/context/ThemeContext";
import Dropdown, { useDropdown } from "@/components/ui/Dropdown";
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
    ShieldCheck,
    Bell
} from "lucide-react";
import { PopulatedUser } from "@/api/generated/model";

export default function Navbar() {
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const { theme, setTheme } = useTheme();

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false);

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

    const NotificationsMainView = ({ user }: { user: PopulatedUser }) => {
        const { pushMenu } = useDropdown();
        return (
            <div className="p-2 min-w-70 max-w-sm whitespace-normal">
                <div className="p-2 border-b border-themed mb-1">
                    <p className="text-[10px] uppercase tracking-widest text-secondary font-bold opacity-50">Notificaciones</p>
                </div>
                {user?.received_friend_requests && user.received_friend_requests.length > 0 ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            pushMenu('friend_requests');
                        }}
                        className="w-full flex items-center justify-between px-3 py-3 text-sm text-primary hover:bg-(--color-bg-secondary)/70 rounded-xl transition-all cursor-pointer group text-left font-medium bg-accent/5"
                    >
                        <div className="flex flex-col">
                            <span className="text-accent font-bold">Solicitudes de amistad</span>
                            <span className="text-xs text-secondary opacity-80">Tienes {user.received_friend_requests.length} nueva{user.received_friend_requests.length > 1 ? 's' : ''}</span>
                        </div>
                        <ChevronDown size={14} className="-rotate-90 group-hover:translate-x-1 transition-transform text-accent" />
                    </button>
                ) : (
                    <div className="p-4 text-center text-secondary opacity-50 text-sm">
                        No tienes notificaciones
                    </div>
                )}
            </div>
        );
    };

    const NotificationsFriendRequestsView = ({ user, navigate }: { user: PopulatedUser, navigate: any }) => {
        const { popMenu, setIsOpen } = useDropdown();
        return (
            <div className="p-2 min-w-70 max-w-sm whitespace-normal flex flex-col">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        popMenu();
                    }}
                    className="px-3 py-2 text-[10px] uppercase tracking-widest text-primary font-bold hover:text-accent transition-colors flex items-center gap-2 cursor-pointer w-full text-left border-b border-themed mb-2"
                >
                    <ChevronDown size={12} className="rotate-90" />
                    Volver
                </button>
                <div className="max-h-60 overflow-y-auto pr-1">
                    {user?.received_friend_requests?.map((req) => (
                        <div key={req._id} className="flex items-center justify-between p-2 hover:bg-secondary/80 rounded-lg transition-colors cursor-pointer group" onClick={() => { setIsOpen(false); navigate(`/user/${req._id}`); }}>
                            <div className="flex items-center gap-2">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req._id}`} className="w-8 h-8 rounded-full bg-secondary border border-themed" alt="Avatar" />
                                <span className="font-bold text-sm text-primary">{req.username}</span>
                            </div>
                            <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">Ver</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const UserMainView = ({ user, logout, navigate, theme, themeLabels }: { user: PopulatedUser, logout: () => void, navigate: any, theme: string, themeLabels: Record<string, string> }) => {
        const { pushMenu, setIsOpen } = useDropdown();
        return (
            <div className="w-64">
                <div className="p-3 border-b border-themed bg-secondary/50">
                    <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-1 opacity-50">Cuenta</p>
                    <p className="text-sm font-bold text-primary truncate">{user?.email}</p>
                </div>
                <div className="p-1">
                    <button onClick={() => { setIsOpen(false); navigate(`/user/${user?._id}`) }} className="w-full flex items-center justify-between text-primary px-3 py-2 text-sm rounded-xl transition-all group text-left hover:bg-(--color-bg-secondary)/70 hover:cursor-pointer font-medium">
                        <div className="flex items-center gap-3">
                            <User size={16} className="shrink-0" />
                            <span className="leading-none">Mi Perfil</span>
                        </div>
                    </button>
                    <button onClick={() => { setIsOpen(false); navigate('/settings') }} className="w-full flex items-center justify-between text-primary px-3 py-2 text-sm rounded-xl transition-all group text-left hover:bg-(--color-bg-secondary)/70 hover:cursor-pointer font-medium">
                        <div className="flex items-center gap-3">
                            <Settings size={16} className="shrink-0" />
                            <span className="leading-none">Ajustes</span>
                        </div>
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
                            pushMenu('theme');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-primary hover:bg-(--color-bg-secondary)/70 rounded-xl transition-all cursor-pointer group text-left font-medium"
                    >
                        <div className="flex items-center gap-3">
                            <Palette size={16} className="shrink-0" />
                            <span className="leading-none">Tema</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-primary opacity-60 font-bold transition-colors">
                            <span className="leading-none">{themeLabels[theme as keyof typeof themeLabels]}</span>
                            <ChevronDown size={12} className="-rotate-90 group-hover:rotate-0 transition-transform shrink-0" />
                        </div>
                    </button>
                </div>
                <div className="p-1 border-t border-themed">
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            logout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer text-left font-bold"
                    >
                        <LogOut size={16} />
                        Cerrar sesión
                    </button>
                </div>
            </div>
        );
    };

    const ThemeMenuView = ({ theme, setTheme }: { theme: Theme, setTheme: (theme: Theme) => void }) => {
        const { popMenu } = useDropdown();
        return (
            <div className="w-64 flex flex-col p-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        popMenu();
                    }}
                    className="w-full flex items-center gap-3 text-secondary px-3 py-2 text-sm rounded-xl transition-all group text-left hover:bg-(--color-bg-secondary)/70 hover:cursor-pointer font-medium mb-1"
                >
                    <ChevronDown size={16} className="rotate-90 shrink-0" />
                    <span className="leading-none">Volver</span>
                </button>
                <div className="flex flex-col">
                    {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                            key={t}
                            disabled={t === 'system'}
                            onClick={() => {
                                if (t !== 'system') {
                                    setTheme(t as any);
                                }
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all group text-left font-medium ${t === 'system'
                                ? 'opacity-30 cursor-not-allowed grayscale'
                                : theme === t
                                    ? 'bg-(--color-bg-secondary)/70 text-primary cursor-pointer'
                                    : 'text-secondary hover:bg-(--color-bg-secondary)/70 hover:cursor-pointer'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`${theme === t ? 'text-primary' : 'text-secondary group-hover:text-primary'} transition-colors shrink-0`}>
                                    {(themeIcons as any)[t]}
                                </div>
                                <span className="leading-none">{(themeLabels as any)[t]}</span>
                                {t === 'system' && (
                                    <span className="text-[10px] bg-secondary/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">Pronto</span>
                                )}
                            </div>
                            {t !== 'system' && theme === t && (
                                <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(var(--color-accent),0.6)]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const OptionsMainView = ({ theme, themeLabels }: { theme: string, themeLabels: Record<string, string> }) => {
        const { pushMenu, setIsOpen } = useDropdown();
        return (
            <div className="w-64 p-1">
                {/* Mobile Auth Options */}
                <div className="sm:hidden mb-2 pb-2 border-b border-themed">
                    <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-secondary font-bold opacity-50">Autenticación</p>
                    <button
                        onClick={() => { setIsOpen(false); navigate('/login'); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-primary hover:bg-(--color-bg-secondary)/70 rounded-xl transition-colors cursor-pointer font-medium"
                    >
                        <User size={16} className="text-accent" />
                        Log in
                    </button>
                    <button
                        onClick={() => { setIsOpen(false); navigate('/register'); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-primary hover:bg-(--color-bg-secondary)/70 rounded-xl transition-colors cursor-pointer font-medium"
                    >
                        <ShieldCheck size={16} className="text-accent" />
                        Register
                    </button>
                </div>

                <p className="hidden sm:block px-3 py-2 text-[10px] uppercase tracking-widest text-secondary font-bold opacity-50">Opciones</p>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        pushMenu('theme');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-primary hover:text-primary hover:bg-(--color-bg-secondary)/70 rounded-xl transition-colors cursor-pointer group text-left font-medium"
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
            </div>
        )
    };

    return (
        <nav className="flex items-center justify-between w-full bg-primary h-16 py-2 px-3 sm:px-6 shadow-sm border-b border-themed relative z-50">
            <div className="flex items-center gap-3 sm:gap-6 shrink-0 z-10">
                <Link to="/" className="cursor-pointer text-primary hover:text-accent hover:underline transition-colors font-medium text-sm sm:text-base whitespace-nowrap">Explore</Link>
                {isAuthenticated && (
                    <Link to="/friends" className="cursor-pointer text-primary hover:text-accent hover:underline transition-colors font-medium text-sm sm:text-base whitespace-nowrap">Amigos</Link>
                )}
            </div>

            <div className="hidden min-[400px]:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <Link to="/" className="text-secondary hover:text-(--color-accent) transition-colors font-bold text-lg sm:text-xl tracking-tighter">flAIghts</Link>
            </div>

            <div className="flex items-center justify-end gap-2 sm:gap-4 shrink-0 z-10 bg-primary">
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:block w-16 h-8 bg-secondary rounded-full animate-pulse opacity-50" />
                        <div className="hidden sm:block w-20 h-8 bg-secondary rounded-full animate-pulse opacity-50" />
                        <div className="w-9 h-9 bg-secondary rounded-full animate-pulse opacity-50" />
                    </div>
                ) : isAuthenticated ? (
                    <div className="flex items-center gap-2">
                        <Dropdown
                            isOpen={isNotificationsMenuOpen}
                            onOpenChange={(open) => {
                                setIsNotificationsMenuOpen(open);
                                if (open) {
                                    setIsUserMenuOpen(false);
                                    setIsOptionsMenuOpen(false);
                                }
                            }}
                            trigger={
                                <div className="relative flex items-center justify-center p-2 bg-secondary hover:bg-secondary/80 border border-themed rounded-full transition-all group cursor-pointer w-9 h-9">
                                    <Bell size={18} className="text-primary group-hover:text-accent transition-colors" />
                                    {user?.received_friend_requests && user.received_friend_requests.length > 0 && (
                                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-accent rounded-full border-2 border-themed" />
                                    )}
                                </div>
                            }
                            menus={{
                                main: (
                                    <NotificationsMainView
                                        user={user!}
                                    />
                                ),
                                friend_requests: (
                                    <NotificationsFriendRequestsView
                                        user={user!}
                                        navigate={navigate}
                                    />
                                )
                            }}
                        />
                        <Dropdown
                            isOpen={isUserMenuOpen}
                            onOpenChange={(open) => {
                                setIsUserMenuOpen(open);
                                if (open) {
                                    setIsOptionsMenuOpen(false);
                                    setIsNotificationsMenuOpen(false);
                                }
                            }}
                            trigger={
                                <div className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-themed p-1 pr-3 rounded-full transition-all group">
                                    {
                                        true ? ( // TODO Implementar avatar
                                            <img
                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?._id}`}
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
                            menus={{
                                main: (
                                    <UserMainView
                                        user={user!}
                                        logout={logout}
                                        navigate={navigate}
                                        theme={theme}
                                        themeLabels={themeLabels}
                                    />
                                ),
                                theme: (
                                    <ThemeMenuView
                                        theme={theme}
                                        setTheme={setTheme}
                                    />
                                )
                            }}
                        />
                    </div>
                ) : (
                    <div className="hidden sm:flex gap-2">
                        <Link to="/login" className="bg-secondary text-primary hover:bg-secondary/80 px-5 py-1.5 rounded-full transition-colors cursor-pointer font-medium text-sm">Log in</Link>
                        <Link to="/register" className="bg-accent bg-accent-hover text-on-accent hover:bg-accent-hover px-5 py-1.5 rounded-full transition-colors cursor-pointer font-medium text-sm text-center">Register</Link>
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
                                setIsNotificationsMenuOpen(false);
                            }
                        }}
                        trigger={
                            <div className="w-9 h-9 flex items-center justify-center bg-secondary hover:bg-secondary/80 border border-themed rounded-full text-primary transition-all active:scale-90 cursor-pointer">
                                <User size={20} className="sm:hidden" />
                                <MoreHorizontal size={20} className="hidden sm:block" />
                            </div>
                        }
                        menus={{
                            main: (
                                <OptionsMainView
                                    theme={theme}
                                    themeLabels={themeLabels}
                                />
                            ),
                            theme: (
                                <ThemeMenuView
                                    theme={theme}
                                    setTheme={setTheme}
                                />
                            )
                        }}
                    />
                )}
            </div>
        </nav>
    );
}
