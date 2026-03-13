import { useState } from "react";
import { Outlet, useMatches } from "react-router-dom";
import { Menu } from "lucide-react";
import Navbar from "./Navbar.tsx";
import Sidebar from "./Sidebar.tsx";
import Footer from "./Footer.tsx";

function useIsGlobeRoute() {
    const matches = useMatches();
    return matches.some(match => (match.handle as any)?.isGlobe === true);
}

/**
 * AppLayout — single persistent layout for all app pages.
 * Sidebar is the same DOM node across navigations, enabling smooth variant transitions.
 * variant='floating' on Globe pages, variant='classic' on content pages.
 */
export default function AppLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isGlobe = useIsGlobeRoute();

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
    const closeSidebar = () => setIsSidebarOpen(false);

    const variant = isGlobe ? 'floating' : 'classic';

    return (
        <div className={`h-svh w-full bg-main text-content overflow-hidden flex flex-col sm:flex-row`}>
            {/* Mobile Top Navbar */}
            {!isGlobe && (
                <div className="sm:hidden w-full h-14 bg-main border-b border-line flex items-center justify-between px-4 shrink-0 z-40">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 text-content-muted hover:text-content active:scale-95 transition-all cursor-pointer rounded-xl hover:bg-surface"
                        >
                            <Menu size={22} />
                        </button>
                        <span className="font-bold tracking-tight text-lg">flAIghts</span>
                    </div>

                    {/* Integrated Navbar actions (flat variant) */}
                    <Navbar variant="flat" />
                </div>
            )}

            {/* Single Sidebar instance — persists across navigations */}
            <Sidebar
                key="app-sidebar"
                variant={variant}
                isOpen={isSidebarOpen}
                onClose={closeSidebar}
                onToggle={toggleSidebar}
            />

            {/* Classic layout spacer — only on non-globe pages */}
            {!isGlobe && (
                <div className="hidden sm:block w-16 shrink-0 h-full pointer-events-none" />
            )}

            <div className={`flex flex-col min-w-0 relative grow shrink min-h-0 ${isGlobe ? 'w-full' : ''}`}>
                <header className={`absolute top-0 left-0 w-full z-40 pointer-events-none ${isGlobe ? 'block' : 'hidden sm:block'}`}>
                    <Navbar variant="floating" />
                </header>

                {/* Backdrop */}
                <div
                    className={`fixed inset-0 bg-black/40 z-30 transition-opacity duration-300 pointer-events-none
                        ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}
                    `}
                />

                <main
                    onClick={() => isSidebarOpen && closeSidebar()}
                    className={`grow bg-surface overflow-auto relative transition-[padding] duration-300 ease-in-out min-h-0
                        ${isGlobe
                            ? `w-full ${isSidebarOpen ? 'sm:pl-64' : ''}`
                            : 'w-full'
                        }
                    `}
                >
                    <div className={isSidebarOpen ? 'pointer-events-none h-full' : 'h-full'}>
                        <Outlet />
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}
