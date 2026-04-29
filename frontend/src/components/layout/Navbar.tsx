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
    Sun,
    Moon,
    Monitor,
    Palette,
    ShieldCheck,
    Bell,
    Trophy,
    MoreHorizontal,
    History,
    Languages
} from "lucide-react";
import { PopulatedUser } from "@/api/generated/openapi/model";
import UserAvatar from "@/components/ui/UserAvatar";
import NavIconButton from "@/components/ui/NavIconButton";
import { useMissions } from "@/context/MissionContext";
import Logo from "@/components/ui/Logo";
import type { LogoHandle } from "@/components/ui/Logo";
import { useGetConversations } from "@/api/generated/openapi/conversations";

export default function Navbar({ variant = 'floating', logoRef }: { variant?: 'floating' | 'flat', logoRef?: React.RefObject<LogoHandle | null> }) {
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const { t, i18n } = useTranslation();

    const { data: conversationsData } = useGetConversations(undefined, {
        query: {
            enabled: isAuthenticated,
            staleTime: 30000, // No necesitamos frescura absoluta en el navbar
        }
    });

    const unreadMessagesCount = conversationsData?.items?.reduce((acc: number, conv: any) => acc + (conv.unreadCount || 0), 0) || 0;

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

    const { isEvaluationMode, hasConsented, setShowRoadmap, missions, isMissionRated, allCompleted, reopenConsent, onboardingStep, surveyOnboardingStep } = useMissions();
    const isTutorialActive = onboardingStep > 0 || surveyOnboardingStep > 0;
    const pendingSurveysCount = missions.filter(m => m.isCompleted && !isMissionRated(m.id)).length;

    const NotificationsMainView = ({ user, unreadMessagesCount }: { user: PopulatedUser, unreadMessagesCount: number }) => {
        const { pushMenu, setIsOpen } = useDropdown();
        const hasFriendRequests = user.received_friend_requests.length > 0;
        const hasUnreadMessages = unreadMessagesCount > 0;

        return (
            <div className="p-2 min-w-70 max-w-sm whitespace-normal flex flex-col gap-1">
                <div className="p-2 border-b border-line mb-1">
                    <p className="text-[10px] uppercase tracking-widest text-content-muted font-bold opacity-50">{t("navbar.notifications")}</p>
                </div>

                {hasUnreadMessages && (
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            navigate('/chats');
                        }}
                        className="w-full flex items-center justify-between px-3 py-3 text-sm text-content hover:bg-surface/70 rounded-xl transition-all cursor-pointer group text-left font-medium bg-brand/5"
                    >
                        <div className="flex flex-col">
                            <span className="text-brand font-bold">Mensajes no leídos</span>
                            <span className="text-xs text-content-muted opacity-80">Tienes {unreadMessagesCount} mensaje{unreadMessagesCount > 1 ? 's' : ''} nuevo{unreadMessagesCount > 1 ? 's' : ''}</span>
                        </div>
                        <ChevronDown size={14} className="-rotate-90 group-hover:translate-x-1 transition-transform text-brand" />
                    </button>
                )}

                {hasFriendRequests && (
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
                )}

                {!hasFriendRequests && !hasUnreadMessages && (
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
                    {user.received_friend_requests.map((req) => (
                        <div key={req._id} className="flex items-center justify-between p-2 hover:bg-surface/80 rounded-lg transition-colors cursor-pointer group" onClick={() => { setIsOpen(false); navigate(`/user/${req._id}`); }}>
                            <div className="flex items-center gap-2">
                                <UserAvatar user={req} size={32} />
                                <span className="font-bold text-sm text-content">{req.username}</span>
                            </div>
                            <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">{t("navbar.view")}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const UserMainView = ({ user, logout, navigate, theme, themeLabels, unreadMessagesCount }: { user: PopulatedUser, logout: () => void, navigate: any, theme: Theme, themeLabels: Record<string, string>, unreadMessagesCount: number }) => {
        const { pushMenu, setIsOpen } = useDropdown();
        const totalNotifications = user.received_friend_requests.length + unreadMessagesCount;

        return (
            <div className="w-64">
                {isEvaluationMode && (
                    <div className="lg:hidden p-1 border-b border-line bg-brand/5">
                        <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-brand font-black opacity-70">Evaluación</p>
                        <button
                            id="nav-missions-button-mobile"
                            onClick={() => {
                                setIsOpen(false);
                                if (hasConsented) {
                                    setShowRoadmap(true);
                                } else {
                                    reopenConsent();
                                }
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm text-content hover:bg-brand/10 rounded-xl transition-all cursor-pointer group text-left font-medium"
                        >
                            <div className="flex items-center gap-3">
                                <Trophy size={20} className={`shrink-0 transition-colors ${pendingSurveysCount > 0 ? (isTutorialActive ? "text-amber-500" : "text-amber-500 animate-soft-pulse") : allCompleted ? "text-green-500" : "group-hover:text-brand"}`} />
                                <span className="leading-none font-bold">Misiones</span>
                            </div>
                            {pendingSurveysCount > 0 && (
                                <span className="text-[10px] text-brand font-bold bg-brand/10 px-1.5 py-0.5 rounded-full">
                                    {pendingSurveysCount}
                                </span>
                            )}
                        </button>
                    </div>
                )}
                <div className="p-3 border-b border-line bg-surface/50">
                    <p className="text-[10px] uppercase tracking-widest text-content-muted font-bold mb-1 opacity-50">{t("navbar.account")}</p>
                    <p className="text-sm font-bold text-content truncate">{user.email}</p>
                </div>
                <div className="p-1">
                    {/* Sección de notificaciones - Solo visible en móvil/tablet si flotante */}
                    <div className="lg:hidden border-b border-line mb-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                pushMenu('notifications');
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm text-content hover:bg-surface/70 rounded-xl transition-all cursor-pointer group text-left font-medium"
                        >
                            <div className="flex items-center gap-3">
                                <Bell size={20} className="shrink-0 group-hover:text-brand transition-colors" />
                                <span className="leading-none">{t("navbar.notifications")}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {totalNotifications > 0 && (
                                    <span className="text-[10px] text-brand font-bold bg-brand/10 px-1.5 py-0.5 rounded-full">
                                        {totalNotifications}
                                    </span>
                                )}
                                <ChevronDown size={14} className="-rotate-90 opacity-60" />
                            </div>
                        </button>
                    </div>


                    <button onClick={() => { setIsOpen(false); navigate(`/user/${user._id}`) }} className="w-full flex items-center justify-between text-content px-4 py-3 text-sm rounded-xl transition-all group text-left hover:bg-surface/70 hover:cursor-pointer font-medium">
                        <div className="flex items-center gap-3">
                            <User size={20} className="shrink-0" />
                            <span className="leading-none">{t("navbar.myProfile")}</span>
                        </div>
                    </button>
                    <button
                        onClick={() => { setIsOpen(false); navigate('/history') }}
                        className="w-full flex items-center justify-between text-content px-4 py-3 text-sm rounded-xl transition-all group text-left hover:bg-surface/70 hover:cursor-pointer font-medium"
                    >
                        <div className="flex items-center gap-3">
                            <History size={20} className="shrink-0" />
                            <span className="leading-none">Historial</span>
                        </div>
                    </button>
                    <button
                        onClick={() => { setIsOpen(false); navigate('/settings') }}
                        className="w-full flex items-center justify-between text-content px-4 py-3 text-sm rounded-xl transition-all group text-left hover:bg-surface/70 hover:cursor-pointer font-medium"
                    >
                        <div className="flex items-center gap-3">
                            <Settings size={20} className="shrink-0" />
                            <span className="leading-none">{t("navbar.settings")}</span>
                        </div>
                    </button>
                    {(user.role === 'admin' || user.role === 'superadmin') && (
                        <button onClick={() => { setIsOpen(false); navigate('/admin') }} className="w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl transition-all group text-left hover:bg-surface/70 cursor-pointer font-medium">
                            <div className="flex items-center gap-3 text-amber-500">
                                <ShieldCheck size={20} />
                                Panel Admin
                            </div>
                            <ChevronDown size={12} className="-rotate-90 opacity-60" />
                        </button>
                    )}

                </div>
                <div className="p-1 border-t border-line">
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            logout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer text-left font-bold"
                    >
                        <LogOut size={20} />
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
                    className="w-full flex items-center gap-3 text-content-muted px-4 py-3 text-sm rounded-xl transition-[background-color_300ms,border-color_150ms,color_300ms,transform_300ms,opacity_300ms,box-shadow_300ms] group text-left hover:bg-surface/70 hover:cursor-pointer font-medium mb-1"
                >
                    <ChevronDown size={20} className="rotate-90 shrink-0" />
                    <span className="leading-none">{t("navbar.back")}</span>
                </button>
                <div className="flex flex-col">
                    {(['light', 'dark', 'system'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTheme(t)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl transition-all group text-left font-medium
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

    const LanguageMenuView = () => {
        const { i18n, t } = useTranslation();
        const { popMenu } = useDropdown();

        const languages = [
            { code: 'es', label: 'Español', flag: '🇪🇸' },
            { code: 'en', label: 'English', flag: '🇺🇸' }
        ];

        return (
            <div className="w-64 flex flex-col p-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        popMenu();
                    }}
                    className="w-full flex items-center gap-3 text-content-muted px-4 py-3 text-sm rounded-xl transition-all group text-left hover:bg-surface/70 hover:cursor-pointer font-medium mb-1"
                >
                    <ChevronDown size={20} className="rotate-90 shrink-0" />
                    <span className="leading-none">{t("navbar.back")}</span>
                </button>
                <div className="flex flex-col">
                    {languages.map((lng) => (
                        <button
                            key={lng.code}
                            onClick={() => i18n.changeLanguage(lng.code)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-sm rounded-xl transition-all group text-left font-medium
                                ${i18n.language === lng.code
                                    ? 'bg-surface/70 text-content cursor-pointer'
                                    : 'text-content-muted hover:bg-surface/70 hover:cursor-pointer'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{lng.flag}</span>
                                <span className="leading-none">{lng.label}</span>
                            </div>
                            {i18n.language === lng.code && (
                                <div className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_8px_rgba(var(--color-brand),0.6)]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const OptionsMainView = ({ theme, themeLabels, navigate }: { theme: Theme, themeLabels: Record<string, string>, navigate: any }) => {
        const { pushMenu, setIsOpen } = useDropdown();
        return (
            <div className="w-64 p-1">
                {isEvaluationMode && (
                    <div className="lg:hidden mb-2 pb-2 border-b border-line bg-brand/5 rounded-xl">
                        <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-brand font-black opacity-70">Evaluación</p>
                        <button
                            id="nav-missions-button-mobile-alt"
                            onClick={() => {
                                setIsOpen(false);
                                if (hasConsented) {
                                    setShowRoadmap(true);
                                } else {
                                    reopenConsent();
                                }
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm text-content hover:bg-brand/10 rounded-xl transition-all cursor-pointer group text-left font-medium"
                        >
                            <div className="flex items-center gap-3">
                                <Trophy size={16} className={`shrink-0 transition-colors ${pendingSurveysCount > 0 ? (isTutorialActive ? "text-amber-500" : "text-amber-500 animate-soft-pulse") : allCompleted ? "text-green-500" : "group-hover:text-brand"}`} />
                                <span className="leading-none font-bold">{t("navbar.missions")}</span>
                            </div>
                        </button>
                    </div>
                )}

                {/* Mobile/Tablet Auth Options */}
                <div className="lg:hidden mb-2 pb-2 border-b border-line">
                    <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-content-muted font-bold opacity-50">{t("navbar.authentication")}</p>
                    <button
                        onClick={() => { setIsOpen(false); navigate('/login'); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-content hover:bg-surface/70 rounded-xl transition-colors cursor-pointer font-medium"
                    >
                        <User size={20} className="text-brand" />
                        {t("navbar.login")}
                    </button>
                    <button
                        onClick={() => { setIsOpen(false); navigate('/register'); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-content hover:bg-surface/70 rounded-xl transition-colors cursor-pointer font-medium"
                    >
                        <ShieldCheck size={20} className="text-brand" />
                        {t("navbar.register")}
                    </button>
                </div>

                <p className="hidden sm:block px-3 py-2 text-[10px] uppercase tracking-widest text-content-muted font-bold opacity-50">Opciones</p>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        pushMenu('theme');
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-content hover:text-content hover:bg-surface/70 rounded-xl transition-colors cursor-pointer group text-left font-medium"
                >
                    <div className="flex items-center gap-3">
                        <Palette size={20} className="group-hover:text-brand transition-colors" />
                        {t("navbar.theme")}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-content-muted opacity-60 font-bold">
                        {themeLabels[theme as keyof typeof themeLabels]}
                        <ChevronDown size={14} className="-rotate-90" />
                    </div>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        pushMenu('language');
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-content hover:text-content hover:bg-surface/70 rounded-xl transition-colors cursor-pointer group text-left font-medium"
                >
                    <div className="flex items-center gap-3">
                        <Languages size={20} className="group-hover:text-brand transition-colors" />
                        {t("navbar.language")}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-content-muted opacity-60 font-bold uppercase">
                        {i18n.language}
                        <ChevronDown size={14} className="-rotate-90" />
                    </div>
                </button>
            </div>
        );
    };

    return (
        <>
            {/* CENTER LOGO */}
            <div className={variant === 'floating'
                ? "absolute top-6 left-1/2 -translate-x-1/2 h-12 flex items-center z-header pointer-events-none"
                : "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-header pointer-events-none"
            }>
                <Logo ref={logoRef} className={variant === 'floating' ? "" : "scale-90 sm:scale-100"} />
            </div>

            <nav className={variant === 'floating' ? "contents" : "contents"}>
                <div className={variant === 'floating'
                    ? "absolute top-6 right-4 flex items-center justify-end gap-2 sm:gap-4 z-content pointer-events-auto"
                    : "flex items-center gap-2 sm:gap-4 pointer-events-auto"
                }>
                    {/* Mission Indicator Button (Evaluation Mode) */}
                    {isEvaluationMode && (
                        <NavIconButton
                            id="nav-missions-button"
                            variant={variant}
                            onClick={() => {
                                if (hasConsented) {
                                    setShowRoadmap(true);
                                } else {
                                    reopenConsent();
                                }
                            }}
                            showBadge={pendingSurveysCount > 0}
                            title={t("navbar.evaluationMissions")}
                            className={`hidden lg:flex ${pendingSurveysCount > 0 && !isTutorialActive ? "animate-soft-pulse" : ""}`}
                        >
                            <Trophy
                                size={20}
                                className={pendingSurveysCount > 0 ? "text-amber-500" : allCompleted ? "text-green-500" : "text-content group-hover:text-brand transition-colors"}
                            />
                        </NavIconButton>
                    )}

                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="hidden sm:block w-16 h-8 bg-surface rounded-full animate-pulse opacity-50" />
                            <div className="hidden sm:block w-20 h-8 bg-surface rounded-full animate-pulse opacity-50" />
                            <div className="w-12 h-12 bg-surface rounded-2xl sm:rounded-full animate-pulse opacity-50" />
                        </div>
                    ) : isAuthenticated ? (
                        <>
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
                                    <NavIconButton
                                        variant={variant}
                                        showBadge={user.received_friend_requests.length > 0 || unreadMessagesCount > 0}
                                        className="hidden lg:flex"
                                    >
                                        <Bell size={20} className="text-content group-hover:text-brand transition-colors" />
                                    </NavIconButton>
                                }
                                menus={{
                                    main: (
                                        <NotificationsMainView
                                            user={user}
                                            unreadMessagesCount={unreadMessagesCount}
                                        />
                                    ),
                                    friend_requests: (
                                        <NotificationsFriendRequestsView
                                            user={user}
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
                                    <NavIconButton
                                        id="nav-user-menu-trigger"
                                        variant={variant}
                                        showBadge={user.received_friend_requests.length > 0 || unreadMessagesCount > 0}
                                        badgeClassName="lg:hidden"
                                    >
                                        <UserAvatar user={user} size={38} />
                                    </NavIconButton>
                                }
                                menus={{
                                    main: (
                                        <UserMainView
                                            user={user}
                                            logout={logout}
                                            navigate={navigate}
                                            theme={theme}
                                            themeLabels={themeLabels}
                                            unreadMessagesCount={unreadMessagesCount}
                                        />
                                    ),
                                    theme: (
                                        <ThemeMenuView
                                            theme={theme}
                                            setTheme={setTheme}
                                        />
                                    ),
                                    notifications: (
                                        <NotificationsMainView
                                            user={user!}
                                            unreadMessagesCount={unreadMessagesCount}
                                        />
                                    ),
                                    friend_requests: (
                                        <NotificationsFriendRequestsView
                                            user={user!}
                                            navigate={navigate}
                                        />
                                    ),
                                    language: (
                                        <LanguageMenuView />
                                    )
                                }}
                            />
                        </>
                    ) : (
                        <div className="hidden lg:flex gap-2">
                            <NavIconButton to="/login" variant={variant} isPill>
                                {t("navbar.login")}
                            </NavIconButton>
                            <NavIconButton
                                to="/register"
                                variant={variant}
                                isPill
                                className="bg-brand! hover:bg-brand-hover! text-content-on-brand! border-none!"
                            >
                                {t("navbar.register")}
                            </NavIconButton>
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
                                <NavIconButton
                                    id="nav-options-menu-trigger"
                                    variant={variant}
                                    className={variant === 'flat' ? 'bg-transparent! border-transparent! shadow-none' : ''}
                                >
                                    <MoreHorizontal size={22} className="hidden lg:block" />
                                    <User size={22} className="block lg:hidden" />
                                </NavIconButton>
                            }
                            menus={{
                                main: (
                                    <OptionsMainView
                                        theme={theme}
                                        themeLabels={themeLabels}
                                        navigate={navigate}
                                    />
                                ),
                                theme: (
                                    <ThemeMenuView
                                        theme={theme}
                                        setTheme={setTheme}
                                    />
                                ),
                                language: (
                                    <LanguageMenuView />
                                )
                            }}
                        />
                    )}
                </div>
            </nav>
        </>
    );
}
