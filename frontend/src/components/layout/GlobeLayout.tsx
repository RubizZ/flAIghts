import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.tsx";
import Sidebar from "./Sidebar.tsx";
import Footer from "./Footer.tsx";

/**
 * GlobeLayout — immersive full-screen layout for pages with the Globe.
 * The sidebar is hidden by default (only a floating hamburger pill button visible).
 * Background elements (Globe) always fill 100% of viewport.
 */
export default function GlobeLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="relative h-screen w-full bg-main text-content overflow-hidden">
            <Sidebar variant="floating" isOpen={isSidebarOpen} onClose={closeSidebar} onToggle={toggleSidebar} />

            <header className="absolute top-0 left-0 w-full z-40 pointer-events-none">
                <Navbar variant="floating" />
            </header>

            {/* Backdrop when sidebar is open */}
            <div
                className={`fixed inset-0 bg-black/40 z-30 transition-opacity duration-300 pointer-events-none
                    ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}
                `}
            />

            <main
                onClick={() => isSidebarOpen && closeSidebar()}
                className={`w-full h-full bg-surface overflow-auto relative transition-[padding] duration-300 ease-in-out
                    ${isSidebarOpen ? 'sm:pl-63' : ''}
                `}
            >
                <div className={isSidebarOpen ? 'pointer-events-none' : ''}>
                    <Outlet />
                </div>
            </main>
            <Footer />
        </div>
    );
}
