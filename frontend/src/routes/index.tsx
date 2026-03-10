import { RouteObject } from "react-router-dom";
import RootLayout from "@/components/layout/RootLayout";
import AppLayout from "@/components/layout/AppLayout";
import RouteErrorBoundary from "@/components/common/RouteErrorBoundary";

import NotFound from "@/pages/NotFound.tsx";
import Login from "@/pages/Login.tsx";
import Register from "@/pages/Register.tsx";
import SearchResults from "@/pages/SearchResults.tsx";
import SearchFlight from "@/pages/SearchFlight.tsx";
import ForgotPassword from "@/pages/ForgotPassword.tsx";
import ResetPassword from "@/pages/ResetPassword.tsx";
import UserProfile from "@/pages/UserProfile.tsx";
import Friends from "@/pages/Friends.tsx";
import UserSearch from "@/pages/UserSearch.tsx";
import Settings from "@/pages/Settings.tsx";

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
                /* App routes */
                element: <AppLayout />,
                children: [
                    { path: "/", element: <SearchFlight />, handle: { isGlobe: true } },
                    { path: "/search/:id", element: <SearchResults />, handle: { isGlobe: true } },
                    { path: "/friends", element: <Friends /> },
                    { path: "/user/:id", element: <UserProfile /> },
                    { path: "/user/search", element: <UserSearch /> },
                    { path: "/settings", element: <Settings /> },
                    { path: "*", element: <NotFound /> },
                ]
            }
        ]
    }
];