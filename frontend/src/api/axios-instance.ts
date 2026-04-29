import axios, { AxiosRequestConfig, AxiosError } from 'axios';

// Códigos de error de autenticación que deben redirigir a login
export const AUTH_FAIL_CODES = [
    'NO_TOKEN_PROVIDED',
    'INVALID_TOKEN',
    'TOKEN_USER_NOT_FOUND',
    'AUTH_VERSION_MISMATCH',
] as const;

export type AuthFailCode = typeof AUTH_FAIL_CODES[number];

// Clase de error para errores de autenticación que deben redirigir a login
export class AuthFailError extends Error {
    public readonly isAuthError = true;
    public readonly code: AuthFailCode;

    constructor(code: AuthFailCode, message?: string) {
        super(message ?? `Authentication failed: ${code}`);
        this.code = code;
        this.name = 'AuthFailError';
    }
}

// Clase de error para fallos de conexión
export class ConnectionError extends Error {
    public readonly isConnectionError = true;

    constructor(message?: string) {
        super(message ?? 'No se ha podido establecer conexión con el servidor.');
        this.name = 'ConnectionError';
    }
}

// Clase de error para límite de peticiones (429)
export class RateLimitError extends Error {
    public readonly isRateLimitError = true;

    constructor(message?: string) {
        super(message ?? 'Has realizado demasiadas peticiones. Por favor, espera un momento.');
        this.name = 'RateLimitError';
    }
}

// Función para verificar si un código es un error de auth fail
export const isAuthFailCode = (code: unknown): code is AuthFailCode => {
    return typeof code === 'string' && AUTH_FAIL_CODES.includes(code as AuthFailCode);
};

/** 
 * Tipo de error transformado por customInstance en orval.
 * Los errores ya llegan como response.data.data directamente,
 * sin el wrapper de AxiosError ni el { status: 'fail' }.
 * 
 * EXCEPTO los 4 tipos de error de autenticación (NO_TOKEN_PROVIDED, INVALID_TOKEN,
 * TOKEN_USER_NOT_FOUND, AUTH_VERSION_MISMATCH), que se lanzan como AuthFailError.
 * 
 * Si D es una unión de tipos, excluye los que tienen esos 4 códigos de auth.
 * Extrae el tipo `data` del tipo generado por Orval (que tiene { status, data }).
 */
export type ErrorType<T> = T extends { data: infer D }
    ? Exclude<
        D,
        | { code: 'NO_TOKEN_PROVIDED' }
        | { code: 'INVALID_TOKEN' }
        | { code: 'TOKEN_USER_NOT_FOUND' }
        | { code: 'AUTH_VERSION_MISMATCH' }
    >
    : T;

const getApiBaseUrl = () => {
    const url = import.meta.env.VITE_BACKEND_API_BASE_URL;
    if (!url) {
        throw new Error('La URL de la API (VITE_BACKEND_API_BASE_URL) no está definida');
    }
    return url;
};

export const AXIOS_INSTANCE = axios.create({
    withCredentials: true
});

// Mutador para Orval: extrae los datos y gestiona la cancelación
export type BodyType<T> = T extends { data: infer D } ? D : T;

// Interceptor para peticiones exitosas: si una petición tiene éxito, el servidor está vivo
AXIOS_INSTANCE.interceptors.response.use(
    (response) => {
        window.dispatchEvent(new CustomEvent('server-up'));
        return response;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const customInstance = <T>(
    config: AxiosRequestConfig,
    options?: AxiosRequestConfig
): Promise<BodyType<T>> => {
    const source = axios.CancelToken.source();

    // Obtenemos la URL de la API. Si no está definida, lanzamos un error que podrá
    // ser capturado por un ErrorBoundary si se llama durante un render (p.ej. desde un hook).
    const baseURL = getApiBaseUrl();

    const promise = AXIOS_INSTANCE({
        ...config,
        ...options,
        baseURL,
        cancelToken: source.token,
    })
        .then(({ data }) => {
            // Si la respuesta sigue el formato JSend ({ status: 'success', data: ... })
            // devolvemos directamente data.data
            if (data && typeof data === 'object' && 'status' in data && 'data' in data) {
                return data.data;
            }
            return data;
        })
        .catch((error: AxiosError<{ data: { code?: string } }>) => {
            // Transforma el error para que solo contenga response.data.data
            // Elimina el wrapper { status: 'fail', data: ... }
            const errorData = error.response?.data?.data;

            // Si es un error de autenticación (token inválido, expirado, etc.),
            // lanzamos AuthFailError para que suba al ErrorBoundary
            if (errorData && typeof errorData === 'object' && 'code' in errorData) {
                const code = (errorData as { code: string }).code;
                if (isAuthFailCode(code)) {
                    return Promise.reject(new AuthFailError(code));
                }
            }

            if (errorData) {
                return Promise.reject(errorData);
            }

            const isCancel = axios.isCancel(error) || error.name === 'CanceledError' || error.message === 'Query was cancelled';
            const status = error.response?.status;

            // Si es una cancelación, no es un error de conexión ni de servidor
            if (isCancel) return Promise.reject(error);

            const isNetworkError = !error.response ||
                error.code === 'ERR_NETWORK' ||
                error.code === 'ECONNABORTED' ||
                error.code === 'ECONNREFUSED' ||
                error.message.toLowerCase().includes('network error') ||
                error.message.toLowerCase().includes('connection refused');

            // Detección inteligente: Si no es un error de red, comprobamos si la respuesta viene 
            // de nuestra aplicación (formato JSend). Si no hay respuesta o no tiene el formato 
            // esperado, es un fallo de infraestructura (Proxy, Server Down, etc.)
            const isAppResponse = error.response?.data && 
                                typeof error.response.data === 'object' && 
                                'status' in error.response.data;

            if (isNetworkError || (error.response && !isAppResponse)) {
                // Emitimos un evento global para que el ConnectionOverlay reaccione al instante
                window.dispatchEvent(new CustomEvent('server-down'));

                return Promise.reject(new ConnectionError(error.message));
            }

            if (status === 429) {
                return Promise.reject(new RateLimitError(error.message));
            }

            return Promise.reject(error);
        });

    // Se añade el metodo cancel al promise para que React Query pueda abortar la peticion
    // any se pone porque las promesas estándar no tienen .cancel, pero Orval lo requiere
    (promise as any).cancel = () => {
        source.cancel('Query was cancelled');
    };

    return promise as Promise<BodyType<T>>;
};

export default customInstance;
