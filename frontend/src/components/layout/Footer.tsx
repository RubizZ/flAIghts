import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Info, X } from "lucide-react";
import DottedBackground from "../ui/DottedBackground";

export default function Footer() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showButton, setShowButton] = useState(false);

    // Efecto para mostrar el boton que abre el footer si el scroll es (casi) maximo o si el footer esta abierto
    useEffect(() => {
        const handleScroll = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;

            const isAtBottom = windowHeight + scrollTop >= documentHeight - 50;

            setShowButton(isAtBottom || isExpanded);
        };

        window.addEventListener("scroll", handleScroll);
        handleScroll();

        return () => window.removeEventListener("scroll", handleScroll);
    }, [isExpanded]);

    return (
        <>
            {/* Boton de apertura/cierre del footer */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`fixed bottom-6 right-6 z-50 p-3 bg-accent text-on-accent rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-500 cursor-pointer border border-white/20 group ${showButton ? "translate-y-0 opacity-100 scale-100" : "translate-y-20 opacity-0 scale-50 pointer-events-none"
                    }`}
                aria-label="Toggle information"
            >
                {isExpanded ? (
                    <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                ) : (
                    <Info size={24} />
                )}
            </button>

            {/* Footer extensible */}
            <footer
                className={`fixed bottom-0 left-0 w-full bg-accent/90 backdrop-blur-2xl text-on-accent transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] z-40 transform ${isExpanded ? "translate-y-0 shadow-[0_-20px_100px_-20px_rgba(0,0,0,0.7)]" : "translate-y-full"
                    } border-t border-white/30`}
                style={{
                    maskImage: 'linear-gradient(to bottom, transparent, black 15%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%)'
                }}
            >
                {/* Textura de fondo */}
                <DottedBackground />

                {/* Brillo en el borde superior */}
                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" />

                <div className="relative pt-16 pb-12 px-6">
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="flex flex-col items-center md:items-start text-center md:text-left">
                            <span className="font-bold text-3xl tracking-tighter mb-2 bg-clip-text text-transparent bg-linear-to-b from-white to-white/60">flAIghts</span>
                            <p className="text-sm opacity-50 font-medium">© {new Date().getFullYear()} flAIghts. Innovating the way you fly.</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-x-10 gap-y-6">
                            <Link to="/about" onClick={() => setIsExpanded(false)} className="text-sm font-semibold hover:opacity-100 opacity-70 transition-all hover:-translate-y-px">About us</Link>
                            <Link to="/contact" onClick={() => setIsExpanded(false)} className="text-sm font-semibold hover:opacity-100 opacity-70 transition-all hover:-translate-y-px">Contact</Link>
                            <Link to="/privacy" onClick={() => setIsExpanded(false)} className="text-sm font-semibold hover:opacity-100 opacity-70 transition-all hover:-translate-y-px">Privacy Policy</Link>
                            <Link to="/terms" onClick={() => setIsExpanded(false)} className="text-sm font-semibold hover:opacity-100 opacity-70 transition-all hover:-translate-y-px">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Overlay para cerrar al hacer clic fuera */}
            {isExpanded && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity"
                    onClick={() => setIsExpanded(false)}
                />
            )}
        </>
    );
}
