import { createContext, useContext, useRef } from "react";
import type { LogoHandle } from "@/components/ui/Logo";

interface NavLogoContextType {
    hideLogo: () => void;
    showLogo: () => void;
}

const NavLogoContext = createContext<NavLogoContextType | null>(null);

export function useNavLogo() {
    const ctx = useContext(NavLogoContext);
    if (!ctx) throw new Error("useNavLogo must be used within NavLogoProvider");
    return ctx;
}

export function NavLogoProvider({ children, logoRef }: {
    children: React.ReactNode;
    logoRef: React.RefObject<LogoHandle | null>;
}) {
    return (
        <NavLogoContext.Provider value={{
            hideLogo: () => logoRef.current?.hide(),
            showLogo: () => logoRef.current?.show(),
        }}>
            {children}
        </NavLogoContext.Provider>
    );
}
