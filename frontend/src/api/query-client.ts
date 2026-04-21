import { QueryClient } from "@tanstack/react-query";
import { AuthFailError, ConnectionError } from "./axios-instance";

export default new QueryClient({
    defaultOptions: {
        queries: {
            // Delega los errores de servidor (5xx) o auth fail al ErrorBoundary
            throwOnError: (error: any) => {
                // AuthFailError siempre se lanza al ErrorBoundary
                if (error instanceof AuthFailError) return true;

                // ConnectionError NO se lanza al ErrorBoundary (lo manejamos con overlay global)
                if (error instanceof ConnectionError) return false;

                // Errores de negocio desenvueltos (no son AxiosError y tienen code), no se lanzan
                if (!error.isAxiosError && error.code) return false;

                // Errores de servidor (5xx) se lanzan al ErrorBoundary
                return error.response?.status >= 500;
            },
            // Reintentar fallos de conexión indefinidamente cada 5 segundos
            retry: (failureCount, error: any) => {
                if (error instanceof ConnectionError) return true;
                if (error.response?.status >= 500) return failureCount < 3;
                return false;
            },
            retryDelay: (attempt) => {
                return Math.min(attempt * 1000, 5000) + Math.round(Math.random() * 1000);
            },
            refetchOnWindowFocus: (query) => {
                // Si ya falló por conexión, reintentar al volver a la ventana
                return query.state.error instanceof ConnectionError;
            }
        },
        mutations: {
            throwOnError: (error: any) => {
                if (error instanceof AuthFailError) return true;
                if (error instanceof ConnectionError) return false;
                if (!error.isAxiosError && error.code) return false;
                return error.response?.status >= 500;
            },
            retry: (_failureCount, error: any) => {
                if (error instanceof ConnectionError) return true;
                return false;
            },
            retryDelay: (attempt) => {
                return Math.min(attempt * 1000, 5000) + Math.round(Math.random() * 1000);
            },
        },
    },
});
