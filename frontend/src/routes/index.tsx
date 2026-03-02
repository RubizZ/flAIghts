import { RouteObject } from "react-router-dom";
import RootLayout from "../components/layout/RootLayout.tsx";
import RouteErrorBoundary from "../components/common/RouteErrorBoundary.tsx";

// Pages
import Home from "../pages/Home.tsx";
import NotFound from "../pages/NotFound.tsx";
import Login from "../pages/Login.tsx";
import Register from "../pages/Register.tsx";
import SearchResults from "../pages/SearchResults.tsx";
import ForgotPassword from "@/pages/ForgotPassword.tsx";
import ResetPassword from "@/pages/ResetPassword.tsx";
import EmailVerification from "@/pages/EmailVerification.tsx";
import UserProfile from "@/pages/UserProfile.tsx";
import Friends from "@/pages/Friends.tsx";

// Layouts
import MainLayout from "../components/layout/MainLayout.tsx";
import UserSearch from "@/pages/UserSearch.tsx";

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
                    { path: "/verify-email", element: <EmailVerification /> },
                ]

            },
            {
                /* Main Layout routes */
                element: <MainLayout />,
                children: [
                    { path: "/", element: <Home /> },
                    { path: "/search/:id", element: <SearchResults /> },
                    { path: "/friends", element: <Friends /> },
                    { path: "/user/:id", element: <UserProfile /> },
                    { path: "/user/search", element: <UserSearch /> },
                    { path: "*", element: <NotFound /> },
                ]
            }
        ]
    }
];