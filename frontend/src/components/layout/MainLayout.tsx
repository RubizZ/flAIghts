import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.tsx";
import Footer from "./Footer.tsx";

export default function MainLayout() {
    return (
        <div className="flex flex-col min-h-screen w-full bg-primary text-primary transition-colors">
            <header className="sticky top-0 z-50 w-full">
                <Navbar />
            </header>
            <main className="grow w-full max-w-full bg-secondary p-4">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
