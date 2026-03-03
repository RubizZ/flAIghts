import { createContext, useContext, useCallback, ReactNode, useMemo } from 'react';
import { useGetUser, getGetUserQueryKey } from '@/api/generated/users/users';
import { useLogout } from '@/api/generated/auth/auth';
import { useQueryClient } from '@tanstack/react-query';
import type { SafeUser } from '@/api/generated/model';

interface AuthContextType {
    /** Usuario autenticado actual, null si no está autenticado */
    user: SafeUser | null;
    /** Indica si se está cargando el estado de autenticación */
    isLoading: boolean;
    /** Indica si el usuario está autenticado */
    isAuthenticated: boolean;
    /** Cierra sesión del usuario (invalida todos los tokens) */
    logout: () => Promise<void>;
    /** Refresca los datos del usuario */
    refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const queryClient = useQueryClient();

    // Query para obtener el usuario autenticado
    const {
        data: userResponse,
        isLoading,
        refetch: refetchUser,
        isError,
    } = useGetUser({
        query: {
            // No reintentar en caso de error
            retry: 0,
            // No refetch automático al enfocar la ventana
            refetchOnWindowFocus: false,
            // Mantener datos frescos por 5 minutos
            staleTime: 5 * 60 * 1000,
        },
    });

    // Mutation para cerrar sesión
    const logoutMutation = useLogout();

    // Extraer usuario de la respuesta
    // customInstance ya extrae data.data, así que userResponse es SafeUser directamente
    const user = useMemo(() => {
        if (isError || !userResponse) {
            return null;
        }
        return userResponse;
    }, [userResponse, isError]);

    // Función de logout
    const logout = useCallback(async () => {
        try {
            await logoutMutation.mutateAsync(undefined);
        } catch {
            // Aunque falle la llamada al servidor, limpiamos el estado local
            console.error('Error during logout, clearing local state anyway');
        } finally {
            // Limpiar cache de React Query
            queryClient.removeQueries({ queryKey: getGetUserQueryKey() });
            // Recargar la página para limpiar todo el estado
            window.location.href = '/';
        }
    }, [logoutMutation, queryClient]);

    // Función para refrescar datos del usuario
    const refetch = useCallback(async () => {
        await refetchUser();
    }, [refetchUser]);

    const value = useMemo(
        () => ({
            user,
            isLoading,
            isAuthenticated: !!user,
            logout,
            refetch,
        }),
        [user, isLoading, logout, refetch]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
