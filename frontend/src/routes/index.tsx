import { RouteObject } from "react-router-dom";
import RootLayout from "@/components/layout/RootLayout";
import AppLayout from "@/components/layout/AppLayout";

import NotFound from "@/pages/NotFound.tsx";
import Login from "@/pages/Login.tsx";
import Register from "@/pages/Register.tsx";
import SearchResults from "@/pages/SearchResults.tsx";
import ForgotPassword from "@/pages/ForgotPassword.tsx";
import ResetPassword from "@/pages/ResetPassword.tsx";
import UserProfile from "@/pages/UserProfile.tsx";
import Friends from "@/pages/Friends.tsx";
import UserSearch from "@/pages/UserSearch.tsx";
import AdminDashboard from "@/pages/AdminDashboard.tsx";
import Settings from "@/pages/Settings.tsx";
import Home from "@/pages/Home.tsx";
import TermsOfService from "@/pages/TermsOfService.tsx";
import PrivacyPolicy from "@/pages/PrivacyPolicy.tsx";
import Acknowledgements from "@/pages/Acknowledgements.tsx";
import GeneticTrip from "@/pages/GeneticTrip.tsx";
import Chats from "@/pages/Chats.tsx";
import Chat from "@/pages/Chat.tsx";

export const routes: RouteObject[] = [
    {
        element: <RootLayout />,
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
                    { path: "/", element: <Home />, handle: { isGlobe: true } },
                    { path: "/search/:id", element: <SearchResults />, handle: { isGlobe: true } },
                    { path: "/friends", element: <Friends /> },
                    { path: "/user/:id", element: <UserProfile /> },
                    { path: "/user/search", element: <UserSearch /> },
                    { path: "/admin", element: <AdminDashboard /> },
                    { path: "/chats", element: <Chats /> },
                    { path: "/chats/:userId", element: <Chat /> },
                    { path: "/settings", element: <Settings /> },
                    { path: "/genetic-trip", element: <GeneticTrip /> },
                    { path: "/terms", element: <TermsOfService /> },
                    { path: "/privacy", element: <PrivacyPolicy /> },
                    { path: "/acknowledgements", element: <Acknowledgements /> },
                    { path: "*", element: <NotFound /> },
                ]
            }
        ]
    }
];