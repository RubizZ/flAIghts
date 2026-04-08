import { Outlet } from "react-router-dom";
import LoadingBar from "./LoadingBar.tsx";
import ErrorBoundary from "../common/ErrorBoundary";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";

import { MissionProvider } from "@/context/MissionContext";
import MissionPortal from "../missions/MissionPortal";

export default function RootLayout() {
    const { reset } = useQueryErrorResetBoundary();

    return (
        <ErrorBoundary onReset={reset}>
            <MissionProvider>
                <LoadingBar />
                <Outlet />
                <MissionPortal />
            </MissionProvider>
        </ErrorBoundary>
    );
}
