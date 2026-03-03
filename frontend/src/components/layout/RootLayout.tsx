import { Outlet } from "react-router-dom";
import LoadingBar from "./LoadingBar.tsx";

export default function RootLayout() {
    return (
        <>
            <LoadingBar />
            <Outlet />
        </>
    );
}
