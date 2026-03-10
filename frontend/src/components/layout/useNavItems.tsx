import { Compass, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    show: boolean;
}

/**
 * Single source of truth for sidebar navigation items.
 * Both FloatingSidebar and ClassicSidebar consume this hook.
 */
export function useNavItems(): NavItem[] {
    const { isAuthenticated } = useAuth();

    return [
        {
            label: "Buscar vuelos",
            path: "/",
            icon: <Compass size={20} />,
            show: true,
        },
        {
            label: "Amigos",
            path: "/friends",
            icon: <Users size={20} />,
            show: isAuthenticated,
        },
    ];
}
