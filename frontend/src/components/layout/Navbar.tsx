import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
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
    Bell,
    Menu,
    X
} from "lucide-react";
import { PopulatedUser } from "@/api/generated/model";
import UserAvatar from "@/components/ui/UserAvatar";

export default function Navbar({ variant = 'floating' }: { variant?: 'floating' | 'flat' }) {
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false);

    const themeIcons = {
        light: <Sun size={14} />,
        dark: <Moon size={14} />,
        system: <Monitor size={14} />
    };

    const themeLabels = {
        light: t("settings.appearance.light"),
        dark: t("settings.appearance.dark"),
        system: t("settings.appearance.system")
    };

    const NotificationsMainView = ({ user }: { user: PopulatedUser }) => {
        const { pushMenu } = useDropdown();
        return (
            <div className="p-2 min-w-70 max-w-sm whitespace-normal">
                <div className="p-2 border-b border-line mb-1">
                    <p className="text-[10px] uppercase tracking-widest text-content-muted font-bold opacity-50">{t("navbar.notifications")}</p>
                </div>
                {user?.received_friend_requests && user.received_friend_requests.length > 0 ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            pushMenu('friend_requests');
                        }}
                        className="w-full flex items-center justify-between px-3 py-3 text-sm text-content hover:bg-surface/70 rounded-xl transition-all cursor-pointer group text-left font-medium bg-brand/5"
                    >
                        <div className="flex flex-col">
                            <span className="text-brand font-bold">{t("navbar.friendRequests")}</span>
                            <span className="text-xs text-content-muted opacity-80">{t("navbar.newFriendRequests", { count: user.received_friend_requests.length, plural: user.received_friend_requests.length > 1 ? 's' : '' })}</span>
                        </div>
                        <ChevronDown size={14} className="-rotate-90 group-hover:translate-x-1 transition-transform text-brand" />
                    </button>
                ) : (
                    <div className="p-4 text-center text-content-muted opacity-50 text-sm">
                        {t("navbar.noNotifications")}
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
                    className="px-3 py-2 text-[10px] uppercase tracking-widest text-content font-bold hover:text-brand transition-colors flex items-center gap-2 cursor-pointer w-full text-left border-b border-line mb-2"
                >
                    <ChevronDown size={12} className="rotate-90" />
                    {t("navbar.back")}
                </button>
                <div className="max-h-60 overflow-y-auto pr-1">
                    {user?.received_friend_requests?.map((req) => (
                        <div key={req._id} className="flex items-center justify-between p-2 hover:bg-surface/80 rounded-lg transition-colors cursor-pointer group" onClick={() => { setIsOpen(false); navigate(`/user/${req._id}`); }}>
                            <div className="flex items-center gap-2">
                                <UserAvatar user={req} size={32} />
                                <span className="font-bold text-sm text-content">{req.username}</span>
                            </div>
                            <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">Ver</span>
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
                <div className="p-3 border-b border-line bg-surface/50">
                    <p className="text-[10px] uppercase tracking-widest text-content-muted font-bold mb-1 opacity-50">{t("navbar.account")}</p>
                    <p className="text-sm font-bold text-content truncate">{user?.email}</p>
                </div>
                <div className="p-1">
                    <button onClick={() => { setIsOpen(false); navigate(`/user/${user?._id}`) }} className="w-full flex items-center justify-between text-content px-3 py-2 text-sm rounded-xl transition-all group text-left hover:bg-surface/70 hover:cursor-pointer font-medium">
                        <div className="flex items-center gap-3">
                            <User size={16} className="shrink-0" />
                            <span className="leading-none">{t("navbar.myProfile")}</span>
                        </div>
                    </button>
                    <button onClick={() => { setIsOpen(false); navigate('/settings') }} className="w-full flex items-center justify-between text-content px-3 py-2 text-sm rounded-xl transition-all group text-left hover:bg-surface/70 hover:cursor-pointer font-medium">
                        <div className="flex items-center gap-3">
                            <Settings size={16} className="shrink-0" />
                            <span className="leading-none">{t("navbar.settings")}</span>
                        </div>
                    </button>
                    {user?.role === 'admin' && (
                        <button className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all cursor-not-allowed group text-left">
                            <div className="flex items-center gap-3 opacity-20 text-amber-500">
                                <ShieldCheck size={16} />
                                {t("navbar.adminPanel")}
                            </div>
                            <span className="text-[8px] bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter opacity-20 text-amber-500">{t("navbar.soon")}</span>
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            pushMenu('theme');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-content hover:bg-surface/70 rounded-xl transition-all cursor-pointer group text-left font-medium"
                    >
                        <div className="flex items-center gap-3">
                            <Palette size={16} className="shrink-0" />
                            <span className="leading-none">{t("navbar.theme")}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-content opacity-60 font-bold transition-colors">
                            <span className="leading-none">{themeLabels[theme as keyof typeof themeLabels]}</span>
                            <ChevronDown size={12} className="-rotate-90 group-hover:rotate-0 transition-transform shrink-0" />
                        </div>
                    </button>
                </div>
                <div className="p-1 border-t border-line">
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            logout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer text-left font-bold"
                    >
                        <LogOut size={16} />
                        {t("settings.general.logout")}
                    </button>
                </div>
            </div>
        );
    };

    const ThemeMenuView = ({ theme, setTheme }: { theme: Theme, setTheme: (theme: Theme) => void }) => {
        const { popMenu } = useDropdown();
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const systemThemeStatus = isSystemDark ? themeLabels.dark : themeLabels.light;

        return (
            <div className="w-64 flex flex-col p-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        popMenu();
                    }}
                    className="w-full flex items-center gap-3 text-content-muted px-3 py-2 text-sm rounded-xl transition-[background-color_300ms,border-color_150ms,color_300ms,transform_300ms,opacity_300ms,box-shadow_300ms] group text-left hover:bg-surface/70 hover:cursor-pointer font-medium mb-1"
                >
                    <ChevronDown size={16} className="rotate-90 shrink-0" />
                    <span className="leading-none">{t("navbar.back")}</span>
                </button>
                <div className="flex flex-col">
                    {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTheme(t)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all group text-left font-medium
                                ${theme === t
                                    ? 'bg-surface/70 text-content cursor-pointer'
                                    : 'text-content-muted hover:bg-surface/70 hover:cursor-pointer'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`${theme === t ? 'text-content' : 'text-content-muted group-hover:text-content'} transition-colors shrink-0`}>
                                    {themeIcons[t]}
                                </div>
                                <span className="leading-none">
                                    {themeLabels[t]}
                                    {t === 'system' && (
                                        <span className="ml-1 opacity-50 font-normal">({systemThemeStatus})</span>
                                    )}
                                </span>
                            </div>
                            {theme === t && (
                                <div className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_8px_rgba(var(--color-brand),0.6)]" />
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
                <div className="sm:hidden mb-2 pb-2 border-b border-line">
                    <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-content-muted font-bold opacity-50">{t("navbar.authentication")}</p>
                    <button
                        onClick={() => { setIsOpen(false); navigate('/login'); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-content hover:bg-surface/70 rounded-xl transition-colors cursor-pointer font-medium"
                    >
                        <User size={16} className="text-brand" />
                        {t("login.actions.login")}
                    </button>
                    <button
                        onClick={() => { setIsOpen(false); navigate('/register'); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-content hover:bg-surface/70 rounded-xl transition-colors cursor-pointer font-medium"
                    >
                        <ShieldCheck size={16} className="text-brand" />
                        {t("register.steps.step2Title")}
                    </button>
                </div>

                <p className="hidden sm:block px-3 py-2 text-[10px] uppercase tracking-widest text-content-muted font-bold opacity-50">{t("navbar.options")}</p>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        pushMenu('theme');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-content hover:text-content hover:bg-surface/70 rounded-xl transition-colors cursor-pointer group text-left font-medium"
                >
                    <div className="flex items-center gap-3">
                        <Palette size={16} className="group-hover:text-brand transition-colors" />
                        {t("navbar.theme")}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-content-muted opacity-60 font-bold">
                        {themeLabels[theme as keyof typeof themeLabels]}
                        <ChevronDown size={12} className="-rotate-90" />
                    </div>
                </button>
            </div>
        )
    };

    return (
        <nav className={variant === 'floating' ? "flex items-center justify-end w-full h-10 px-4 relative z-50 pointer-events-none" : "contents"}>
            <div className={variant === 'floating'
                ? "flex items-center justify-end p-1.5 gap-2 sm:gap-4 shrink-0 z-10 bg-main/40 backdrop-blur-md border border-line rounded-3xl pointer-events-auto shadow-2xl"
                : "flex items-center gap-2 sm:gap-4 pointer-events-auto"
            }>
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:block w-16 h-8 bg-surface rounded-full animate-pulse opacity-50" />
                        <div className="hidden sm:block w-20 h-8 bg-surface rounded-full animate-pulse opacity-50" />
                        <div className="w-9 h-9 bg-surface rounded-full animate-pulse opacity-50" />
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
                                <div className="relative flex items-center justify-center p-2 bg-surface hover:bg-surface/80 border border-line rounded-full transition-all group cursor-pointer w-9 h-9">
                                    <Bell size={18} className="text-content group-hover:text-brand transition-colors" />
                                    {user?.received_friend_requests && user.received_friend_requests.length > 0 && (
                                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-brand rounded-full border-2 border-line" />
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
                                <div className="flex items-center gap-2 bg-surface hover:bg-surface/80 border border-line p-1 pr-3 rounded-full transition-all group">
                                    <UserAvatar user={user} size={28} />
                                    <span className="text-content text-sm font-bold hidden sm:block max-w-24 truncate">
                                        {user?.username}
                                    </span>
                                    <ChevronDown size={14} className={`text-content-muted opacity-60 transition-all ${isUserMenuOpen ? 'rotate-180' : ''}`} />
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
                        <Link to="/login" className="bg-surface text-content hover:bg-surface/80 px-5 py-1.5 rounded-full transition-colors cursor-pointer font-medium text-sm">{t("login.actions.login")}</Link>
                        <Link to="/register" className="bg-brand text-content-on-brand hover:bg-brand-hover px-5 py-1.5 rounded-full transition-colors cursor-pointer font-medium text-sm text-center">{t("register.steps.step2Title")}</Link>
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
                            <div className="w-9 h-9 flex items-center justify-center bg-surface hover:bg-surface/80 border border-line rounded-full text-content transition-all active:scale-90 cursor-pointer">
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
