import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { ThemeProvider } from "./context/ThemeContext.tsx"
import { AuthProvider } from "./context/AuthContext.tsx"
import { routes } from "./routes";
import { QueryClient, QueryClientProvider, QueryErrorResetBoundary } from "@tanstack/react-query";
import { Toaster } from 'sonner';
import ErrorBoundary from "./components/common/ErrorBoundary.tsx";

const router = createBrowserRouter(routes);

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Delega los errores de servidor (5xx) o red al ErrorBoundary más cercano (RootLayout)
            throwOnError: (error: any) => {
                // Errores de negocio desenvueltos (no son AxiosError y tienen code), no se lanzan
                if (!error.isAxiosError && error.code) return false;

                // Errores de servidor (5xx) o de red (sin response), se lanzan al ErrorBoundary
                return !error.response || error.response.status >= 500;
            },
            retry: false, // Opcional: evita reintentos infinitos si falla el servidor
        },
        mutations: {
            // Lo mismo para mutaciones (Login, etc.)
            throwOnError: (error: any) => {
                if (!error.isAxiosError && error.code) return false;
                return !error.response || error.response.status >= 500;
            },
        },
    },
});

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
