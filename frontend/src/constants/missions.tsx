import React, { useEffect } from 'react';
import { BaseMission, Mission } from '@/types/missions';
import { useAuth } from '@/context/AuthContext';
import { useMissions } from '@/context/MissionContext';
import { useMutationState } from '@tanstack/react-query';
import { getAgentStreamMutationKey } from '@/api/generated/asyncapi/hooks';
import { getAgentChatMutationOptions } from '@/api/generated/openapi/agent';
import { getSearchRequestMutationOptions } from '@/api/generated/openapi/search';
import { getUpdateUserMutationOptions, getSetProfilePictureMutationOptions, getSendFriendRequestMutationOptions } from '@/api/generated/openapi/users';

// --- Claves de Mutación (obtenidas una sola vez) ---
const agentStreamKey = getAgentStreamMutationKey()[0];
const agentChatKey = getAgentChatMutationOptions().mutationKey?.[0] as string;
const searchRequestKey = getSearchRequestMutationOptions().mutationKey?.[0] as string;
const updateUserKey = getUpdateUserMutationOptions().mutationKey?.[0] as string;
const setProfilePictureKey = getSetProfilePictureMutationOptions().mutationKey?.[0] as string;
const sendFriendRequestKey = getSendFriendRequestMutationOptions().mutationKey?.[0] as string;

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

const ProfileUpdatedListener: React.FC = () => {
    const { completeStep } = useMissions();
    const updateMutations = useMutationState({
        filters: { mutationKey: [updateUserKey], status: 'success' },
        select: (mutation) => mutation.state.status,
    });

    useEffect(() => {
        if (updateMutations.length > 0) {
            completeStep('profile_mission', 'edit_preferences');
        }
    }, [updateMutations.length, completeStep]);

    return null;
};

const AvatarUploadedListener: React.FC = () => {
    const { completeStep } = useMissions();
    const avatarMutations = useMutationState({
        filters: { mutationKey: [setProfilePictureKey], status: 'success' },
        select: (mutation) => mutation.state.status,
    });

    useEffect(() => {
        if (avatarMutations.length > 0) {
            completeStep('profile_mission', 'upload_avatar');
        }
    }, [avatarMutations.length, completeStep]);

    return null;
};

const ViewUserProfileListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('social_mission', 'view_user_profile');
        window.addEventListener('view_user_profile', handle);
        return () => window.removeEventListener('view_user_profile', handle);
    }, [completeStep]);
    return null;
};

const SendFriendRequestListener: React.FC = () => {
    const { completeStep } = useMissions();
    const friendMutations = useMutationState({
        filters: { mutationKey: [sendFriendRequestKey], status: 'success' },
        select: (mutation) => mutation.state.status,
    });
    useEffect(() => {
        if (friendMutations.length > 0) {
            completeStep('social_mission', 'send_friend_request');
        }
    }, [friendMutations.length, completeStep]);
    return null;
};

const SendMessageListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('social_mission', 'send_message');
        window.addEventListener('send_message', handle);
        return () => window.removeEventListener('send_message', handle);
    }, [completeStep]);
    return null;
};

const ShareFromResultsListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('share_mission', 'share_from_results');
        window.addEventListener('share_search', handle);
        return () => window.removeEventListener('share_search', handle);
    }, [completeStep]);
    return null;
};

const ShareFromChatListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('share_mission', 'share_from_chat');
        window.addEventListener('share_from_chat', handle);
        return () => window.removeEventListener('share_from_chat', handle);
    }, [completeStep]);
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

const AIFlightsReturnedListener: React.FC = () => {
    const { completeStep } = useMissions();

    useEffect(() => {
        const handleFlightsReturned = () => {
            completeStep('ai_mission', 'receive_ai_flights');
        };
        window.addEventListener('ai_flights_returned', handleFlightsReturned);
        return () => window.removeEventListener('ai_flights_returned', handleFlightsReturned);
    }, [completeStep]);

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
        id: 'social_mission',
        title: 'Haz amigos',
        description: 'Conecta con otras personas.',
        icon: '🤝',
        dependsOn: ['registration_mission'],
        steps: [
            {
                id: 'view_user_profile',
                title: 'Visita un perfil',
                description: 'Busca a un usuario y visita su perfil público. Puedes buscar al usuario "flAIghts"',
                listener: ViewUserProfileListener
            },
            {
                id: 'send_friend_request',
                title: 'Envía una solicitud',
                description: 'Manda una solicitud de amistad a ese usuario. El usuario "flAIghts" la aceptará automáticamente.',
                listener: SendFriendRequestListener
            },
            {
                id: 'send_message',
                title: 'Escribe un mensaje',
                description: 'Envíale un mensaje directo para saludar.',
                listener: SendMessageListener
            }
        ]
    },
    {
        id: 'profile_mission',
        title: 'Personaliza tu perfil',
        description: 'Sube una foto de perfil y configura tus preferencias de vuelo.',
        icon: '👤',
        dependsOn: ['registration_mission'],
        steps: [
            {
                id: 'upload_avatar',
                title: 'Sube una foto de perfil',
                description: 'Actualiza tu perfil y sube la foto que más te guste.',
                listener: AvatarUploadedListener
            },
            {
                id: 'edit_preferences',
                title: 'Personaliza tus preferencias',
                description: 'Edita tu perfil y ajusta los pesos de búsqueda o cambia la visibilidad de tu perfil.',
                listener: ProfileUpdatedListener
            }
        ]
    },
    {
        id: 'manual_search_mission',
        title: 'Haz una busqueda de vuelos',
        description: 'Realiza una búsqueda manual de vuelos para ver las opciones disponibles.',
        icon: '🔍',
        dependsOn: ['profile_mission'],
        steps: [
            {
                id: 'perform_manual_search',
                title: 'Búsqueda manual',
                description: 'Realiza una busqueda rellenando los campos necesarios.',
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
                title: 'Selecciona un vuelo como vuelo de ida',
                description: 'Selecciona este vuelo como si fuese a ser tu vuelo de ida.',
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
        id: 'share_mission',
        title: 'Comparte tus viajes',
        description: 'Comparte tus búsquedas de vuelos con tus amigos.',
        icon: '📤',
        dependsOn: ['manual_search_mission', 'social_mission'],
        steps: [
            {
                id: 'share_from_results',
                title: 'Comparte desde resultados',
                description: 'Usa el botón de compartir en la página de resultados de búsqueda.',
                listener: ShareFromResultsListener
            },
            {
                id: 'share_from_chat',
                title: 'Comparte desde el chat',
                description: 'Comparte una búsqueda directamente en una conversación con un amigo.',
                listener: ShareFromChatListener
            }
        ]
    },
    {
        id: 'ai_mission',
        title: 'Prueba la Inteligencia Artificial',
        description: 'Usa el agente de IA para planificar un viaje complejo mediante lenguaje natural.',
        icon: '🤖',
        dependsOn: ['manual_search_mission'],
        steps: [
            {
                id: 'use_ai',
                title: 'Usa la IA',
                description: 'Escribe un mensaje al agente.',
                listener: AIChatStepListener
            },
            {
                id: 'receive_ai_flights',
                title: 'Recibe vuelos de la IA',
                description: 'Pídele al agente que te busque vuelos y espera su respuesta.',
                listener: AIFlightsReturnedListener
            }
        ]
    }
];
