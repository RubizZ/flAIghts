import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
    Compass,
    Users,
    Home,
    Search,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

interface SidebarProps {
    isOpen: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { isAuthenticated, isLoading } = useAuth();
    const [clickedItem, setClickedItem] = useState<string | null>(null);
    const location = useLocation();

    const navItems = [
        {
            label: "Buscar vuelos",
            path: "/",
            icon: <Compass size={22} />,
            show: true
        },
        {
            label: "Amigos",
            path: "/friends",
            icon: <Users size={22} />,
            show: isAuthenticated
        }
    ];

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="sm:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            <aside
                className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-main border-r border-line z-50 transition-all duration-300 ease-in-out shadow-lg
                    ${isOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full sm:translate-x-0'}
                    flex flex-col
                `}
            >
                <div className="flex flex-col gap-2 p-2">
                    {isLoading ? (
                        // Global Skeleton State
                        Array.from({ length: 2 }).map((_, i) => (
                            <div
                                key={`skeleton-${i}`}
                                className="flex items-center rounded-2xl w-full px-3 py-3 justify-start opacity-50 animate-fade-in animate-duration-250"
                            >
                                <div className="shrink-0 w-5.5 h-5.5 bg-line rounded-lg animate-pulse" />
                                <div
                                    className={`ml-4 h-4 bg-line rounded animate-pulse transition-all duration-300
                                        ${isOpen ? 'w-24 opacity-100' : 'w-0 opacity-0 overflow-hidden'}
                                    `}
                                />
                            </div>
                        ))
                    ) : (
                        // Actual Navigation Items
                        navItems.filter(item => item.show).map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onMouseEnter={() => setClickedItem(null)}
                                    onClick={() => {
                                        onClose?.();
                                        setClickedItem(item.path);
                                    }}
                                    className={`flex items-center rounded-2xl transition-all duration-200 group relative w-full px-3 py-3 justify-start animate-fade-in animate-duration-250
                                    ${isActive
                                            ? 'bg-brand text-content-on-brand shadow-md'
                                            : 'text-content-muted hover:bg-surface hover:text-content'
                                        }
                                `}
                                >
                                    <div className={`shrink-0 transition-colors duration-300 ${isActive ? 'text-content-on-brand' : 'group-hover:text-brand'}`}>
                                        {item.icon}
                                    </div>
                                    <span
                                        className={`font-bold transition-all duration-300 whitespace-nowrap overflow-hidden
                                        ${isOpen
                                                ? 'opacity-100 translate-x-0 w-auto ml-4'
                                                : 'opacity-0 -translate-x-2 w-0 ml-0 pointer-events-none'
                                            }
                                    `}
                                    >
                                        {item.label}
                                    </span>

                                    {!isOpen && clickedItem !== item.path && (
                                        <div className={`absolute left-full ml-3 px-3 py-1.5 backdrop-blur-md border rounded-xl text-xs font-bold shadow-2xl pointer-events-none z-50 whitespace-nowrap opacity-0
                                            group-hover:opacity-100 group-hover:animate-expand-vertically group-hover:animate-duration-200 group-hover:animate-delay-400
                                            ${isActive
                                                ? 'bg-brand text-content-on-brand'
                                                : 'bg-surface/95 text-content border-line'
                                            }`}
                                        >
                                            {item.label}
                                            {/* Tooltip Arrow */}
                                            <div className={`absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rotate-45 border-l border-b
                                                ${isActive
                                                    ? 'bg-brand border-brand'
                                                    : 'bg-surface border-line'
                                                }
                                            `} />
                                        </div>
                                    )}
                                </Link>
                            );
                        })
                    )}
                </div>

                <div className="mt-auto w-full overflow-hidden">
                    <div className={`p-4 border-t border-line transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                        <Link
                            to="/about"
                            onClick={() => onClose?.()}
                            className="block text-[10px] uppercase tracking-widest text-content-muted font-bold opacity-50 whitespace-nowrap text-center hover:text-brand hover:opacity-100 transition-all"
                        >
                            flAIghts
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    );
}
