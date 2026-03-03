import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import nprogress from 'nprogress';

/** 
 * Tipo de error transformado por customInstance en orval.
 * Los errores ya llegan como response.data.data directamente,
 * sin el wrapper de AxiosError ni el { status: 'fail' }.
 * En caso de que no tenga response, el QueryClient lanza un error
 * para que acabe en el ErrorBoundary.
 * 
 * Extrae el tipo `data` del tipo generado por Orval (que tiene { status, data }).
 */
export type ErrorType<T> = T extends { data: infer D } ? D : T;

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

// Contador de peticiones activas para manejar peticiones concurrentes
let activeRequests = 0;

const startProgress = () => {
    if (activeRequests === 0) {
        nprogress.start();
    }
    activeRequests++;
};

const stopProgress = () => {
    activeRequests--;
    if (activeRequests <= 0) {
        activeRequests = 0;
        nprogress.done();
    }
};

// Interceptor de peticiones
AXIOS_INSTANCE.interceptors.request.use(
    (config) => {
        startProgress();
        return config;
    },
    (error) => {
        stopProgress();
        return Promise.reject(error);
    }
);

// Interceptor de respuestas
AXIOS_INSTANCE.interceptors.response.use(
    (response) => {
        stopProgress();
        return response;
    },
    (error) => {
        stopProgress();
        return Promise.reject(error);
    }
);

// Mutador para Orval: extrae los datos y gestiona la cancelación
export type BodyType<T> = T extends { data: infer D } ? D : T;

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
        .catch((error: AxiosError<{ data: unknown }>) => {
            // Transforma el error para que solo contenga response.data.data
            // Elimina el wrapper { status: 'fail', data: ... }
            if (error.response?.data?.data) {
                return Promise.reject(error.response.data.data);
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
