import React, { useEffect, useRef } from 'react';
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

    useEffect(() => {
        const handleEvent = () => {
            completeStep('profile_mission', 'edit_preferences');
        };

        window.addEventListener('flaights:preferences-updated', handleEvent);
        return () => window.removeEventListener('flaights:preferences-updated', handleEvent);
    }, [completeStep]);

    return null;
};

const AvatarUploadedListener: React.FC = () => {
    const { completeStep } = useMissions();
    const avatarMutations = useMutationState({
        filters: { mutationKey: [setProfilePictureKey], status: 'success' },
        select: (mutation) => mutation.state.status,
    });
    const initialCount = useRef(avatarMutations.length);

    useEffect(() => {
        if (avatarMutations.length > initialCount.current) {
            completeStep('profile_mission', 'upload_avatar');
        }
    }, [avatarMutations.length, completeStep]);

    return null;
};

const ViewUserProfileListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('social_mission', 'view_user_profile');
        window.addEventListener('flaights:mission:view-user-profile', handle);
        return () => window.removeEventListener('flaights:mission:view-user-profile', handle);
    }, [completeStep]);
    return null;
};

const SendFriendRequestListener: React.FC = () => {
    const { completeStep } = useMissions();
    const friendMutations = useMutationState({
        filters: { mutationKey: [sendFriendRequestKey], status: 'success' },
        select: (mutation) => mutation.state.status,
    });
    const initialCount = useRef(friendMutations.length);

    useEffect(() => {
        if (friendMutations.length > initialCount.current) {
            completeStep('social_mission', 'send_friend_request');
        }
    }, [friendMutations.length, completeStep]);
    return null;
};

const SendMessageListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('social_mission', 'send_message');
        window.addEventListener('flaights:mission:send-message', handle);
        return () => window.removeEventListener('flaights:mission:send-message', handle);
    }, [completeStep]);
    return null;
};

const ShareFromResultsListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('share_mission', 'share_from_results');
        window.addEventListener('flaights:mission:share-from-results', handle);
        return () => window.removeEventListener('flaights:mission:share-from-results', handle);
    }, [completeStep]);
    return null;
};

const ShareFromChatListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('share_mission', 'share_from_chat');
        window.addEventListener('flaights:mission:share-from-chat', handle);
        return () => window.removeEventListener('flaights:mission:share-from-chat', handle);
    }, [completeStep]);
    return null;
};

const OpenAirportCardListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('manual_search_mission', 'open_airport_card');
        window.addEventListener('flaights:mission:open-airport-card', handle);
        return () => window.removeEventListener('flaights:mission:open-airport-card', handle);
    }, [completeStep]);
    return null;
};

const AddAirportListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('manual_search_mission', 'add_airport');
        window.addEventListener('flaights:mission:add-airport', handle);
        return () => window.removeEventListener('flaights:mission:add-airport', handle);
    }, [completeStep]);
    return null;
};

const OpenMapListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('map_search_mission', 'open_map');
        window.addEventListener('flaights:mission:open-map', handle);
        return () => window.removeEventListener('flaights:mission:open-map', handle);
    }, [completeStep]);
    return null;
};

const SelectOnMapListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('map_search_mission', 'select_on_map');
        window.addEventListener('flaights:mission:select-on-map', handle);
        return () => window.removeEventListener('flaights:mission:select-on-map', handle);
    }, [completeStep]);
    return null;
};

const ManualSearchStepListener: React.FC = () => {
    const { completeStep } = useMissions();
    const searchMutations = useMutationState({
        filters: { mutationKey: [searchRequestKey], status: 'success' },
        select: (mutation) => mutation.state.status,
    });
    const initialCount = useRef(searchMutations.length);

    useEffect(() => {
        if (searchMutations.length > initialCount.current) {
            completeStep('manual_search_mission', 'perform_manual_search');
            completeStep('map_search_mission', 'perform_map_search');
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
    const initialCount = useRef(chatMutations.length);

    useEffect(() => {
        if (chatMutations.length > initialCount.current) {
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
        window.addEventListener('flaights:mission:ai-flights-returned', handleFlightsReturned);
        return () => window.removeEventListener('flaights:mission:ai-flights-returned', handleFlightsReturned);
    }, [completeStep]);

    return null;
};

const AIGetSearchHistoryListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('ai_mission', 'get_search_history');
        window.addEventListener('flaights:mission:agent-get-user-search-history', handle);
        return () => window.removeEventListener('flaights:mission:agent-get-user-search-history', handle);
    }, [completeStep]);
    return null;
};

const ViewFlightDetailsListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handler = () => completeStep('flight_results_mission', 'view_flight_details');
        window.addEventListener('flaights:mission:view-flight-details', handler);
        return () => window.removeEventListener('flaights:mission:view-flight-details', handler);
    }, [completeStep]);
    return null;
};

const SelectFlightListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handler = () => completeStep('flight_results_mission', 'select_flight');
        window.addEventListener('flaights:mission:select-flight', handler);
        return () => window.removeEventListener('flaights:mission:select-flight', handler);
    }, [completeStep]);
    return null;
};

const BuyFlightListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handler = () => completeStep('flight_results_mission', 'buy_flight');
        window.addEventListener('flaights:mission:buy-flight', handler);
        return () => window.removeEventListener('flaights:mission:buy-flight', handler);
    }, [completeStep]);
    return null;
};

const AccessSearchHistoryListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handler = () => completeStep('flight_results_mission', 'access_search_history');
        window.addEventListener('flaights:mission:access-search-history', handler);
        return () => window.removeEventListener('flaights:mission:access-search-history', handler);
    }, [completeStep]);
    return null;
};

const OpenSearchFromHistoryListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handler = () => completeStep('flight_results_mission', 'open_search_from_history');
        window.addEventListener('flaights:mission:open-search-from-history', handler);
        return () => window.removeEventListener('flaights:mission:open-search-from-history', handler);
    }, [completeStep]);
    return null;
};

// --- Configuración de Misiones ---

export const MISSIONS: BaseMission[] = [
    {
        id: 'registration_mission',
        title: 'Regístrate en flAIghts',
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
                title: 'Personaliza tus busquedas de vuelos',
                description: 'Edita tu perfil y ajusta los pesos de búsqueda para que se adapten mejor a tus preferencias.',
                listener: ProfileUpdatedListener
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
        id: 'manual_search_mission',
        title: 'Usa el buscador de vuelos',
        description: 'Realiza una búsqueda manual de vuelos usando el selector de aeropuertos.',
        icon: '🔍',
        dependsOn: ['profile_mission'],
        steps: [
            {
                id: 'open_airport_card',
                title: 'Abre el buscador de aeropuertos',
                description: 'Haz clic en el campo de Origen o Destino para abrir el buscador.',
                listener: OpenAirportCardListener
            },
            {
                id: 'add_airport',
                title: 'Selecciona un aeropuerto',
                description: 'Escribe el nombre de una ciudad o aeropuerto de tu gusto y selecciónalo de la lista.',
                listener: AddAirportListener
            },
            {
                id: 'perform_manual_search',
                title: 'Búsqueda manual',
                description: 'Completa los campos restantes y realiza la búsqueda pulsando en "Explorar vuelos".',
                listener: ManualSearchStepListener
            }
        ]
    },
    {
        id: 'map_search_mission',
        title: 'Usa el mapa interactivo',
        description: 'Realiza una búsqueda interactiva usando el globo terráqueo.',
        icon: '🌍',
        dependsOn: ['flight_results_mission'],
        steps: [
            {
                id: 'open_map',
                title: 'Abre el mapa interactivo',
                description: 'Usa el botón de mapa en los inputs o haz clic directamente en el globo terráqueo para entrar en modo interacción.',
                listener: OpenMapListener
            },
            {
                id: 'select_on_map',
                title: 'Selecciona desde el mapa',
                description: 'Busca un aeropuerto en el globo terráqueo y selecciónalo como origen o destino usando el menú o la tarjeta de información.',
                listener: SelectOnMapListener
            },
            {
                id: 'perform_map_search',
                title: 'Búsqueda desde el mapa',
                description: 'Completa los campos restantes y realiza la búsqueda pulsando en "Explorar vuelos".',
                listener: ManualSearchStepListener
            }
        ]
    },
    {
        id: 'flight_results_mission',
        title: 'Explora los resultados',
        description: 'Interactúa con los vuelos encontrados para encontrar tu opción ideal.',
        icon: '✈️',
        dependsOn: ['manual_search_mission'],
        steps: [
            {
                id: 'view_flight_details',
                title: 'Detalles del vuelo',
                description: 'Selecciona un vuelo para ver sus detalles.',
                listener: ViewFlightDetailsListener
            },
            {
                id: 'select_flight',
                title: 'Selecciona un vuelo como vuelo de ida',
                description: 'Selecciona un vuelo como si fuese a ser tu vuelo de ida.',
                listener: SelectFlightListener
            },
            {
                id: 'buy_flight',
                title: '"Compra" el vuelo',
                description: 'Abre el provedor externo para comprar el vuelo seleccionado y cierra la ventana del proveedor. No te preocupes, no tienes que pagar nada ni comprarlo.',
                listener: BuyFlightListener
            }
        ]
    },
    {
        id: 'share_mission',
        title: 'Comparte tus viajes',
        description: 'Comparte tus búsquedas de vuelos con tus amigos.',
        icon: '📤',
        dependsOn: ['flight_results_mission', 'social_mission'],
        steps: [
            {
                id: 'share_from_results',
                title: 'Comparte desde resultados',
                description: 'Usa el botón de compartir en la página de resultados de búsqueda y compártelo con alguien. Puedes enviarselo al usuario "flAIghts".',
                listener: ShareFromResultsListener
            },
            {
                id: 'share_from_chat',
                title: 'Comparte desde el chat',
                description: 'Comparte una búsqueda directamente en una conversación con un amigo. Puedes enviarsela al usuario "flAIghts".',
                listener: ShareFromChatListener
            }
        ]
    },
    {
        id: 'ai_mission',
        title: 'Prueba la Inteligencia Artificial',
        description: 'Usa el agente de IA para planificar un viaje complejo mediante lenguaje natural.',
        icon: '🤖',
        dependsOn: ['map_search_mission'],
        steps: [
            {
                id: 'use_ai',
                title: 'Usa la IA',
                description: 'Escribe un mensaje al agente.',
                listener: AIChatStepListener
            },
            {
                id: 'get_search_history',
                title: 'Tu historial',
                description: 'Pídele al agente que consulte tus búsquedas anteriores.',
                listener: AIGetSearchHistoryListener
            },
            {
                id: 'receive_ai_flights',
                title: 'Recibe vuelos de la IA',
                description: 'Pídele al agente que te busque vuelos y haz que te recomiende uno de ellos.',
                listener: AIFlightsReturnedListener
            }
        ]
    }
];
