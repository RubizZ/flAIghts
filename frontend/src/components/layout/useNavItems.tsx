import { Compass, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

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
    const { t } = useTranslation();

    return [
        {
            label: t("sidebar.searchFlights"),
            path: "/",
            icon: <Compass size={20} />,
            show: true,
        },
        {
            label: t("sidebar.friends"),
            path: "/friends",
            icon: <Users size={20} />,
            show: isAuthenticated,
        },
    ];
}
