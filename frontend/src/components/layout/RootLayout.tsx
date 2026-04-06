import { Outlet } from "react-router-dom";
import LoadingBar from "./LoadingBar.tsx";
import ErrorBoundary from "../common/ErrorBoundary";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";

export default function RootLayout() {
    const { reset } = useQueryErrorResetBoundary();

    return (
        <ErrorBoundary onReset={reset}>
            <LoadingBar />
            <Outlet />
        </ErrorBoundary>
    );
}
