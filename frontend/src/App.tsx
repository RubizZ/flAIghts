import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { ThemeProvider } from "@/context/ThemeContext"
import { AuthProvider } from "@/context/AuthContext"
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
                <QueryErrorResetBoundary>
                    {({ reset }) => (
                        <ErrorBoundary onReset={reset}>
                            <AuthProvider>
                                <RouterProvider router={router} />
                                <Toaster richColors position="top-center" />
                            </AuthProvider>
                        </ErrorBoundary>
                    )}
                </QueryErrorResetBoundary>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
