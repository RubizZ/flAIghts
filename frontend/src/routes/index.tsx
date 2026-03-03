import { RouteObject } from "react-router-dom";
import RootLayout from "../components/layout/RootLayout.tsx";
import RouteErrorBoundary from "../components/common/RouteErrorBoundary.tsx";

// Pages
import Home from "../pages/Home.tsx";
import NotFound from "../pages/NotFound.tsx";
import Login from "../pages/Login.tsx";
import Register from "../pages/Register.tsx";

// Layouts
import MainLayout from "../components/layout/MainLayout.tsx";
import ForgotPassword from "@/pages/ForgotPassword.tsx";
import ResetPassword from "@/pages/ResetPassword.tsx";

export const routes: RouteObject[] = [
    {
        element: <RootLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
            {
                /* Auth routes */
                children: [
                    { path: "/login", element: <Login /> },
                    { path: "/register", element: <Register /> },
                    { path: "/forgot-password", element: <ForgotPassword /> },
                    { path: "/reset-password", element: <ResetPassword /> },
                ]
            },
            {
                /* Main Layout routes */
                element: <MainLayout />,
                children: [
                    { path: "/", element: <Home /> },
                    { path: "*", element: <NotFound /> },
                ]
            }
        ]
    }
];