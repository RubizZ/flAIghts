import { Compass, Users, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

export interface NavItem {
    label: string;
    icon: React.ReactNode;
    show: boolean;
    /** Navigation items use `path`; action items use `onClick`. */
    path?: string;
    onClick?: () => void;
}

/**
 * Single source of truth for sidebar navigation items.
 * Both FloatingSidebar and ClassicSidebar consume this hook.
 */
export function useNavItems(callbacks?: { onGeneticTrip?: () => void }): NavItem[] {
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
            label: t("sidebar.geneticTrip"),
            icon: <Zap size={20} />,
            show: true,
            onClick: callbacks?.onGeneticTrip,
        },
        {
            label: t("sidebar.friends"),
            path: "/friends",
            icon: <Users size={20} />,
            show: isAuthenticated,
        },
    ];
}
