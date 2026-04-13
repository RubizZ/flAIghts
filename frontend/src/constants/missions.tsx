import React, { useEffect } from 'react';
import { BaseMission, Mission } from '@/types/missions';
import { useAuth } from '@/context/AuthContext';
import { useMissions } from '@/context/MissionContext';
import { useMutationState } from '@tanstack/react-query';
import { getAgentStreamMutationKey } from '@/api/generated/asyncapi/hooks';
import { getAgentChatMutationOptions } from '@/api/generated/openapi/agent';
import { getSearchRequestMutationOptions } from '@/api/generated/openapi/search';

// --- Claves de Mutación (obtenidas una sola vez) ---
const agentStreamKey = getAgentStreamMutationKey()[0];
const agentChatKey = getAgentChatMutationOptions().mutationKey?.[0] as string;
const searchRequestKey = getSearchRequestMutationOptions().mutationKey?.[0] as string;

// --- Listeners de Pasos (definidos aquí para fácil mantenimiento) ---

const RegistrationStepListener: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const { completeStep } = useMissions();
    useEffect(() => {
        if (isAuthenticated) {
            completeStep('registration_mission', 'complete_registration');
        }
    }, [isAuthenticated, completeStep]);
    return null;
};

const ManualSearchStepListener: React.FC = () => {
    const { completeStep } = useMissions();
    const searchMutations = useMutationState({
        filters: { mutationKey: [searchRequestKey], status: 'success' },
        select: (mutation) => mutation.state.status,
    });

    useEffect(() => {
        if (searchMutations.length > 0) {
            completeStep('manual_search_mission', 'perform_manual_search');
        }
    }, [searchMutations.length, completeStep]);

    return null;
};

const AIChatStepListener: React.FC = () => {
    const { completeStep } = useMissions();

    const chatMutations = useMutationState({
        filters: {
            predicate: (mutation) =>
                [agentChatKey, agentStreamKey].includes(mutation.options.mutationKey?.[0] as string) &&
                mutation.state.status === 'pending'
        },
        select: (mutation) => mutation.state.status,
    });

    useEffect(() => {
        if (chatMutations.length > 0) {
            completeStep('ai_mission', 'use_ai');
        }
    }, [chatMutations.length, completeStep]);

    return null;
};

const AIHistoryStepListener: React.FC = () => {
    const { completeStep } = useMissions();

    const chatMutations = useMutationState({
        filters: {
            predicate: (mutation) =>
                [agentChatKey, agentStreamKey].includes(mutation.options.mutationKey?.[0] as string) &&
                mutation.state.status === 'success'
        },
        select: (mutation) => mutation.state.variables as any,
    });

    useEffect(() => {
        const hasRequestedHistory = chatMutations.some(vars => {
            // Normalizar acceso a mensajes (openapi usa 'data', asyncapi usa 'body')
            const messages = vars?.data?.messages || vars?.body?.messages;
            return messages?.some((m: any) =>
                m.content?.toLowerCase().includes('historial') ||
                m.content?.toLowerCase().includes('pasado')
            );
        });

        if (hasRequestedHistory) {
            completeStep('ai_mission', 'perform_ai_search_2');
        }
    }, [chatMutations, completeStep]);

    return null;
};

const ViewFlightDetailsListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handler = () => completeStep('manual_search_mission', 'view_flight_details');
        window.addEventListener('app:view-flight-details', handler);
        return () => window.removeEventListener('app:view-flight-details', handler);
    }, [completeStep]);
    return null;
};

const SelectFlightListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handler = () => completeStep('manual_search_mission', 'select_flight');
        window.addEventListener('app:select-flight', handler);
        return () => window.removeEventListener('app:select-flight', handler);
    }, [completeStep]);
    return null;
};

const BuyFlightListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handler = () => completeStep('manual_search_mission', 'buy_flight');
        window.addEventListener('app:buy-flight', handler);
        return () => window.removeEventListener('app:buy-flight', handler);
    }, [completeStep]);
    return null;
};

// --- Configuración de Misiones ---

export const MISSIONS: BaseMission[] = [
    {
        id: 'registration_mission',
        title: 'Empieza con flAIghts',
        description: 'Regístrate en la plataforma.',
        icon: '🚀',
        steps: [
            {
                id: 'complete_registration',
                title: 'Crea una cuenta',
                description: 'Completa el formulario de registro para acceder a todas las funcionalidades.',
                listener: RegistrationStepListener
            }
        ]
    },
    {
        id: 'manual_search_mission',
        title: 'Haz una busqueda de vuelos',
        description: 'Realiza una búsqueda manual de vuelos para ver las opciones disponibles.',
        icon: '🔍',
        dependsOn: ['registration_mission'],
        steps: [
            {
                id: 'perform_manual_search',
                title: 'Búsqueda manual',
                description: 'Introduce origen, destino y fechas para buscar vuelos.',
                listener: ManualSearchStepListener
            },
            {
                id: 'view_flight_details',
                title: 'Detalles del vuelo',
                description: 'Selecciona un vuelo para ver sus detalles.',
                listener: ViewFlightDetailsListener
            },
            {
                id: 'select_flight',
                title: 'Selecciona un vuelo',
                description: 'Selecciona un vuelo para ver sus detalles.',
                listener: SelectFlightListener
            },
            {
                id: 'buy_flight',
                title: '"Compra" el vuelo',
                description: 'Abre el provedor externo para comprar el vuelo seleccionado. No te preocupes, no tienes que pagar nada ni comprarlo.',
                listener: BuyFlightListener
            }
        ]
    },
    {
        id: 'ai_mission',
        title: 'Prueba la Inteligencia Artificial',
        description: 'Usa el agente de IA para planificar un viaje complejo mediante lenguaje natural.',
        icon: '🤖',
        dependsOn: ['registration_mission'],
        steps: [
            {
                id: 'use_ai',
                title: 'Usa la IA',
                description: 'Escribe un mensaje al agente.',
                listener: AIChatStepListener
            }
        ]
    }
];
