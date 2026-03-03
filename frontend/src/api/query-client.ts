import { QueryClient } from "@tanstack/react-query";
import { AuthFailError } from "./axios-instance";

export default new QueryClient({
    defaultOptions: {
        queries: {
            // Delega los errores de servidor (5xx), red o auth fail al ErrorBoundary más cercano
            throwOnError: (error: any) => {
                // AuthFailError siempre se lanza al ErrorBoundary
                if (error instanceof AuthFailError) return true;

                // Errores de negocio desenvueltos (no son AxiosError y tienen code), no se lanzan
                if (!error.isAxiosError && error.code) return false;

                // Errores de servidor (5xx) o de red (sin response), se lanzan al ErrorBoundary
                return !error.response || error.response.status >= 500;
            },
            retry: false,
        },
        mutations: {
            throwOnError: (error: any) => {
                // AuthFailError siempre se lanza al ErrorBoundary
                if (error instanceof AuthFailError) return true;

                if (!error.isAxiosError && error.code) return false;
                return !error.response || error.response.status >= 500;
            },
        },
    },
});
