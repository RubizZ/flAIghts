import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { ThemeProvider } from "@/context/ThemeContext"
import { AuthProvider } from "@/context/AuthContext"
import { UserLocationProvider } from "@/context/UserLocationContext";
import { routes } from "@/routes";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from 'sonner';
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
