import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.tsx";
import Footer from "./Footer.tsx";

export default function MainLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-primary text-primary transition-colors">
            <header>
                <Navbar />
            </header>
            <main className="grow bg-secondary py-4">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
