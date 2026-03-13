import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Menu, X } from "lucide-react";
import { useNavItems } from "./useNavItems";
import NavIconButton from "../ui/NavIconButton";

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
    const { isLoading } = useAuth();
    const [clickedItem, setClickedItem] = useState<string | null>(null);
    const location = useLocation();
    const navItems = useNavItems();

    const isFloating = variant === 'floating';

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`sm:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm transition-opacity duration-300
                    ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                `}
                onClick={onClose}
            />

            {/* ── EXTERNAL HAMBURGER BUTTON (Only for floating variant) ── */}
            {isFloating && (
                <div className={`fixed left-4 top-4 z-50 transition-all duration-300 ${isOpen ? 'opacity-0 scale-75 pointer-events-none -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}`}>
                    <NavIconButton
                        onClick={onToggle}
                        variant={variant}
                        title="Abrir menú"
                    >
                        <Menu size={20} />
                    </NavIconButton>
                </div>
            )}

            {/* ── SIDEBAR PANEL ── */}
            <aside
                className={`fixed z-50 flex flex-col overflow-hidden transition-all duration-300 ease-out ${className}
                    ${isFloating
                        ? `left-4 top-4 bottom-4 w-60 premium-glass rounded-3xl
                           ${isOpen
                            ? 'translate-x-0 opacity-100 scale-100'
                            : '-translate-x-8 opacity-0 scale-95 pointer-events-none'
                        }`
                        : `left-0 top-0 h-svh bg-main border-r border-line shadow-lg
                           ${isOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full sm:translate-x-0'}`
                    }
                `}
            >
                {/* ── HEADER / TOGGLE BUTTON ── */}
                <div className={`flex items-center shrink-0 ${isFloating ? 'h-14 px-3 border-b border-line/40' : 'h-16 px-2'}`}>
                    <button
                        onClick={onToggle}
                        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
                        className={`transition-all duration-200 cursor-pointer rounded-2xl
                            text-content-muted hover:text-content active:scale-95
                            ${isFloating
                                ? 'p-2.5 hover:bg-white/10 hover:backdrop-blur-md w-full flex items-center gap-3 group'
                                : 'p-3 hover:bg-surface w-full flex justify-center sm:justify-start group'
                            }
                        `}
                    >
                        {isFloating ? (
                            <>
                                <X size={20} className="shrink-0 transition-transform duration-300 group-hover:rotate-90" />
                                <span className="font-bold text-sm text-content">Menú</span>
                            </>
                        ) : (
                            isOpen
                                ? <X size={22} className="group-hover:text-content transition-colors" />
                                : <Menu size={22} className="group-hover:text-content transition-colors" />
                        )}
                    </button>
                </div>

                {/* ── NAV ITEMS ── */}
                <div className={`flex flex-col overflow-y-auto overflow-x-hidden flex-1 ${isFloating ? 'gap-1 p-2' : 'gap-2 p-2 pt-0'}`}>
                    {isLoading ? (
                        Array.from({ length: 2 }).map((_, i) => (
                            <div key={`skeleton-${i}`} className="flex items-center rounded-2xl w-full px-3 py-3 gap-3 opacity-50">
                                <div className="shrink-0 w-5 h-5 bg-line rounded-lg animate-pulse" />
                                {(isFloating || isOpen) && <div className="h-4 w-24 bg-line rounded animate-pulse" />}
                            </div>
                        ))
                    ) : (
                        navItems.filter(item => item.show).map((item, idx) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onMouseEnter={() => !isFloating && setClickedItem(null)}
                                    onClick={() => { onClose?.(); setClickedItem(item.path); }}
                                    {...(isFloating ? {
                                        style: { transitionDelay: isOpen ? `${idx * 40 + 80}ms` : '0ms' }
                                    } : {})}
                                    className={`flex items-center rounded-2xl transition-all duration-200 px-3 py-3 font-bold text-sm relative group
                                        ${isFloating
                                            ? `gap-3 ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`
                                            : 'gap-0 justify-start'
                                        }
                                        ${isActive
                                            ? 'bg-brand text-content-on-brand shadow-md'
                                            : `text-content-muted hover:text-content ${isFloating ? 'hover:bg-white/10 hover:backdrop-blur-md' : 'hover:bg-surface/70'}`
                                        }
                                    `}
                                >
                                    {/* Icon */}
                                    <div className={`shrink-0 transition-colors duration-300 ${isActive ? 'text-content-on-brand' : 'group-hover:text-brand'}`}>
                                        {item.icon}
                                    </div>

                                    {/* Label */}
                                    <span className={`font-bold whitespace-nowrap overflow-hidden transition-all duration-300
                                        ${isFloating
                                            ? 'ml-3'  /* always shown in floating (panel visibility handles it) */
                                            : isOpen
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
                    <Link
                        to="/about"
                        onClick={() => onClose?.()}
                        className="block text-[10px] uppercase tracking-widest text-content-muted font-bold opacity-40
                            whitespace-nowrap text-center hover:text-brand hover:opacity-100 transition-all duration-300"
                    >
                        flAIghts
                    </Link>
                </div>
            </aside>
        </>
    );
}
