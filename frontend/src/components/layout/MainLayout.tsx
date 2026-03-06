import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.tsx";
import Sidebar from "./Sidebar.tsx";
import Footer from "./Footer.tsx";

export default function MainLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="flex flex-col min-h-screen w-full bg-main text-content">
            <header className="sticky top-0 z-50 w-full">
                <Navbar onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
            </header>
            <div className="flex grow w-full relative h-[calc(100vh-64px)] overflow-hidden">
                <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

                {/* Backdrop shadow for main content when sidebar is open */}
                <div
                    className={`fixed inset-0 bg-black/40 z-30 transition-opacity duration-300 pointer-events-none mt-16
                        ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}
                    `}
                />

                <main
                    onClick={() => isSidebarOpen && closeSidebar()}
                    className="grow w-full max-w-full bg-surface p-4 sm:pl-16 overflow-auto"
                >
                    <div className={isSidebarOpen ? 'pointer-events-none' : ''}>
                        <Outlet />
                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
}
