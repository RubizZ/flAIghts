import { useRouteError } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";

/**
 * Puente entre el sistema de errores de React Router y nuestro ErrorBoundary.
 * Se usa como `errorElement` en la configuración de rutas.
 */
export default function RouteErrorBoundary() {
    const error = useRouteError();

    // Convertimos lo que sea que devuelva useRouteError a un objeto Error
    const normalizedError = error instanceof Error
        ? error
        : new Error(typeof error === 'string' ? error : 'Ha ocurrido un error inesperado en la ruta');

    return <ErrorBoundary initialError={normalizedError} />;
}
