import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { ThemeProvider } from "@/context/ThemeContext"
import { AuthProvider } from "@/context/AuthContext"
import { UserLocationProvider } from "@/context/UserLocationContext";
import { routes } from "@/routes";
import { QueryClientProvider, QueryErrorResetBoundary } from "@tanstack/react-query";
import { Toaster } from 'sonner';
import ErrorBoundary from "@/components/common/ErrorBoundary.tsx";
import queryClient from "@/api/query-client";

const router = createBrowserRouter(routes);


export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthProvider>
                    <UserLocationProvider>
                        <RouterProvider router={router} />
                        <Toaster richColors position="top-center" />
                    </UserLocationProvider>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
