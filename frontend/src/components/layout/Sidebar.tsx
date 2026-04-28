import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Compass, Menu, Users, X, MessageSquare, Zap, Sparkles } from "lucide-react";
import NavIconButton from "../ui/NavIconButton";
import { useTranslation } from "react-i18next";

interface SidebarProps {
    isOpen: boolean;
    onClose?: () => void;
    onToggle?: () => void;
    /**
     * 'floating' — pill that floats over content, used in GlobeLayout (immersive pages).
     *              Hidden by default; a floating hamburger button triggers it.
     * 'classic'  — edge-docked strip, used in MainLayout (content pages).
     *              Always visible as a narrow icon-only rail that expands on toggle.
     */
    variant?: 'floating' | 'classic';
    className?: string;
}

export default function Sidebar({ isOpen, onClose, onToggle, variant = 'classic', className = "" }: SidebarProps) {
    const { t } = useTranslation();
    const { isAuthenticated, isLoading } = useAuth();
    const [clickedItem, setClickedItem] = useState<string | null>(null);
    const location = useLocation();
    const navItems = [
        {
            label: t("sidebar.searchFlights"),
            path: "/?m=manual",
            icon: <Compass size={20} />,
            show: true,
        },
        {
            label: t("sidebar.aiAgent"),
            path: "/?m=ai",
            icon: <Sparkles size={20} />,
            show: true,
        },
        {
            label: t("sidebar.geneticTrip"),
            path: "/multi-stop",
            icon: <Zap size={20} />,
            show: true,
        },
        {
            label: t("sidebar.chats"),
            path: "/chats",
            icon: <MessageSquare size={20} />,
            show: isAuthenticated,
        },
        {
            label: t("sidebar.friends"),
            path: "/friends",
            icon: <Users size={20} />,
            show: isAuthenticated,
        },
    ];

    const isFloating = variant === 'floating';

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`sm:hidden fixed inset-0 bg-black/50 z-sticky backdrop-blur-sm transition-opacity duration-200
                    ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                `}
                onClick={onClose}
            />

            {/* ── EXTERNAL HAMBURGER BUTTON (Only for floating variant) ── */}
            {isFloating && (
                <div className={`fixed left-4 top-4 z-sidebar transition-all duration-200 ${isOpen ? 'opacity-0 scale-75 pointer-events-none -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}`}>
                    <NavIconButton
                        onClick={onToggle}
                        variant={variant}
                        title={t("sidebar.openMenu")}
                    >
                        <Menu size={20} />
                    </NavIconButton>
                </div>
            )}

            {/* ── SIDEBAR PANEL ── */}
            <aside
                className={`fixed z-sidebar flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${className}
                    ${isFloating
                        ? `left-4 top-4 bottom-4 premium-glass rounded-3xl border border-white/10 shadow-2xl
                           ${isOpen
                            ? 'w-60 translate-x-0 opacity-100 scale-100'
                            : 'w-16 -translate-x-8 opacity-0 scale-95 pointer-events-none'
                        }`
                        : `left-0 top-0 bottom-0 bg-main border-r border-line shadow-lg rounded-none
                           ${isOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full sm:translate-x-0'}`
                    }
                `}
            >
                {/* ── HEADER / TOGGLE BUTTON ── */}
                <div className={`flex flex-col shrink-0 border-b border-line/40 transition-all duration-300 ${isFloating ? 'h-16' : 'h-20'}`}>
                    {!isFloating && <div className="h-4 w-full shrink-0" />}
                    <div className="flex-1 flex items-center px-2">
                        <button
                            onClick={onToggle}
                            aria-label={isOpen ? t("sidebar.closeMenu") : t("sidebar.openMenu")}
                            className={`transition-all duration-200 cursor-pointer
                                text-content-muted hover:text-content active:scale-95 flex items-center group
                                ${isOpen
                                    ? 'h-12 px-6 hover:bg-surface gap-4 justify-start w-full rounded-2xl'
                                    : 'w-12 h-12 hover:bg-surface justify-center rounded-full'
                                }
                            `}
                        >
                            {isOpen ? (
                                <>
                                    <X size={20} className="shrink-0 transition-transform duration-300 group-hover:rotate-90" />
                                    <span className="font-bold text-sm text-content">{t("sidebar.menu")}</span>
                                </>
                            ) : (
                                <Menu size={20} className="group-hover:text-content transition-colors shrink-0" />
                            )}
                        </button>
                    </div>
                </div>

                {/* ── NAV ITEMS ── */}
                <div className={`flex flex-col overflow-y-auto overflow-x-hidden flex-1 gap-1 px-0 pt-2`}>
                    {isLoading ? (
                        Array.from({ length: 2 }).map((_, i) => (
                            <div key={`skeleton-${i}`} className="flex items-center w-full px-6 py-3 gap-3 opacity-50">
                                <div className="shrink-0 w-5 h-5 bg-line rounded-lg animate-pulse" />
                                {isOpen && <div className="h-4 w-24 bg-line rounded animate-pulse" />}
                            </div>
                        ))
                    ) : (
                        navItems.filter(item => item.show).map((item, idx) => {
                            const isActive = item.path.includes('?')
                                ? (location.pathname + location.search) === item.path || (location.pathname === '/' && location.search === '' && item.path === '/?m=ai')
                                : location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onMouseEnter={() => !isFloating && setClickedItem(null)}
                                    onClick={() => { onClose?.(); setClickedItem(item.path); }}
                                    {...(isFloating ? {
                                        style: { transitionDelay: isOpen ? `${idx * 40 + 80}ms` : '0ms' }
                                    } : {})}
                                    className={`flex items-center transition-all duration-300 font-bold text-sm relative group
                                        ${isFloating
                                            ? `rounded-2xl mx-2 ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`
                                            : ''
                                        }
                                        ${isOpen ? 'px-6 py-3.5 gap-4 justify-start' : 'px-[22px] py-3.5 gap-0 justify-start'}
                                        ${isActive
                                            ? 'bg-brand/10 text-brand border-r-4 border-brand'
                                            : `text-content-muted hover:text-content ${isFloating ? 'hover:bg-white/10 hover:backdrop-blur-md rounded-2xl' : 'hover:bg-surface/70'}`
                                        }
                                    `}
                                >
                                    {/* Icon */}
                                    <div className={`shrink-0 transition-colors duration-300 ${isActive ? 'text-brand' : 'group-hover:text-brand'}`}>
                                        {item.icon}
                                    </div>

                                    {/* Label */}
                                    <span className={`font-bold whitespace-nowrap overflow-hidden transition-all duration-300
                                        ${isOpen
                                            ? 'opacity-100 translate-x-0 w-auto ml-4'
                                            : 'opacity-0 -translate-x-2 w-0 ml-0 pointer-events-none'
                                        }
                                    `}>
                                        {item.label}
                                    </span>

                                    {/* Tooltip for classic collapsed state */}
                                    {!isFloating && !isOpen && clickedItem !== item.path && (
                                        <div className={`absolute left-full ml-3 px-3 py-1.5 backdrop-blur-md border rounded-xl text-xs font-bold shadow-2xl
                                            pointer-events-none z-50 whitespace-nowrap opacity-0
                                            group-hover:opacity-100 group-hover:animate-expand-vertically group-hover:animate-duration-200 group-hover:animate-delay-400
                                            ${isActive ? 'bg-brand text-content-on-brand' : 'bg-surface/95 text-content border-line'}
                                        `}>
                                            {item.label}
                                            <div className={`absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rotate-45 border-l border-b
                                                ${isActive ? 'bg-brand border-brand' : 'bg-surface border-line'}
                                            `} />
                                        </div>
                                    )}
                                </Link>
                            );
                        })
                    )}
                </div>

                {/* ── MOBILE FOOTER LINKS ── */}
                <div
                    className={`sm:hidden px-6 py-4 flex flex-col gap-4 transition-all duration-300 delay-100
                        ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}
                    `}
                >
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <Link to="/about" onClick={onClose} className="text-[11px] font-bold text-content-muted hover:text-brand transition-colors text-center">{t("footer.aboutUs")}</Link>
                        <Link to="/contact" onClick={onClose} className="text-[11px] font-bold text-content-muted hover:text-brand transition-colors text-center">{t("footer.contact")}</Link>
                        <Link to="/privacy" onClick={onClose} className="text-[11px] font-bold text-content-muted hover:text-brand transition-colors text-center">{t("footer.privacyPolicy")}</Link>
                        <Link to="/terms" onClick={onClose} className="text-[11px] font-bold text-content-muted hover:text-brand transition-colors text-center">{t("footer.termsOfService")}</Link>
                    </div>
                </div>

                {/* ── FOOTER ── */}
                <div
                    className={`p-4 border-t border-line/40 transition-all duration-300
                        ${isFloating
                            ? isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                            : isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                        }
                    `}
                    {...(isFloating ? { style: { transitionDelay: isOpen ? '160ms' : '0ms' } } : {})}
                >
                    <span
                        className={`block text-[10px] uppercase tracking-widest text-content-muted font-bold opacity-40
                            whitespace-nowrap text-center transition-all duration-300
                        `}
                    >
                        flAIghts
                    </span>
                </div>
            </aside>
        </>
    );
}