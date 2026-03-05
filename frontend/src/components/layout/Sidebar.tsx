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
    const { isAuthenticated } = useAuth();
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
                className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-primary border-r border-themed z-50 transition-all duration-300 ease-in-out shadow-lg
                    ${isOpen ? 'w-64 translate-x-0' : 'w-16 -translate-x-full sm:translate-x-0'}
                    flex flex-col
                `}
            >
                <div className="flex flex-col gap-2 p-2">
                    {navItems.filter(item => item.show).map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center rounded-2xl transition-all duration-300 group relative w-full px-3 py-3 justify-start
                                ${isActive
                                        ? 'bg-accent text-on-accent shadow-md'
                                        : 'text-secondary hover:bg-(--color-bg-secondary) hover:text-(--color-on-accent)'
                                    }
                            `}
                            >
                                <div className={`shrink-0 transition-colors duration-300 ${isActive ? 'text-on-accent' : 'group-hover:text-accent'}`}>
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

                                {!isOpen && (
                                    <div className={`absolute left-full ml-3 px-3 py-1.5 backdrop-blur-md border rounded-xl text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all pointer-events-none z-50 whitespace-nowrap
                                        ${isActive
                                            ? 'bg-accent text-on-accent'
                                            : 'bg-secondary/95 text-primary border-themed'
                                        }
                                    `}>
                                        {item.label}
                                        {/* Tooltip Arrow */}
                                        <div className={`absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rotate-45 border-l border-b
                                            ${isActive
                                                ? 'bg-accent border'
                                                : 'bg-secondary border-themed'
                                            }
                                        `} />
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>

                <div className="mt-auto w-full overflow-hidden">
                    <div className={`p-4 border-t border-themed transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                        <Link
                            to="/about"
                            className="block text-[10px] uppercase tracking-widest text-secondary font-bold opacity-50 whitespace-nowrap text-center hover:text-accent hover:opacity-100 transition-all"
                        >
                            flAIghts
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    );
}
