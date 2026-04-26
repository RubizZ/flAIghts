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

const OpenGeneticTripListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('genetic_mission', 'open_genetic_trip');
        window.addEventListener('flaights:mission:genetic-trip-opened', handle);
        return () => window.removeEventListener('flaights:mission:genetic-trip-opened', handle);
    }, [completeStep]);
    return null;
};

const GeneticTripCityAddedListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = (e: any) => {
            if (e.detail?.count >= 2) {
                completeStep('genetic_mission', 'add_itinerary_cities');
            }
        };
        window.addEventListener('flaights:mission:genetic-trip-city-added', handle);
        return () => window.removeEventListener('flaights:mission:genetic-trip-city-added', handle);
    }, [completeStep]);
    return null;
};

const GeneticTripPerformedListener: React.FC = () => {
    const { completeStep } = useMissions();
    useEffect(() => {
        const handle = () => completeStep('genetic_mission', 'perform_genetic_search');
        window.addEventListener('flaights:mission:genetic-trip-performed', handle);
        return () => window.removeEventListener('flaights:mission:genetic-trip-performed', handle);
    }, [completeStep]);
    return null;
};

// --- Configuración de Misiones ---

export const MISSIONS: BaseMission[] = [
    {
        id: 'registration_mission',
        title: 'missions.list.registration.title',
        description: 'missions.list.registration.description',
        icon: '🚀',
        steps: [
            {
                id: 'complete_registration',
                title: 'missions.list.registration.steps.complete_registration.title',
                description: 'missions.list.registration.steps.complete_registration.description',
                listener: RegistrationStepListener
            }
        ]
    },
    {
        id: 'profile_mission',
        title: 'missions.list.profile.title',
        description: 'missions.list.profile.description',
        icon: '👤',
        dependsOn: ['registration_mission'],
        steps: [
            {
                id: 'upload_avatar',
                title: 'missions.list.profile.steps.upload_avatar.title',
                description: 'missions.list.profile.steps.upload_avatar.description',
                listener: AvatarUploadedListener
            },
            {
                id: 'edit_preferences',
                title: 'missions.list.profile.steps.edit_preferences.title',
                description: 'missions.list.profile.steps.edit_preferences.description',
                listener: ProfileUpdatedListener
            }
        ]
    },
    {
        id: 'social_mission',
        title: 'missions.list.social.title',
        description: 'missions.list.social.description',
        icon: '🤝',
        dependsOn: ['registration_mission'],
        steps: [
            {
                id: 'view_user_profile',
                title: 'missions.list.social.steps.view_user_profile.title',
                description: 'missions.list.social.steps.view_user_profile.description',
                listener: ViewUserProfileListener
            },
            {
                id: 'send_friend_request',
                title: 'missions.list.social.steps.send_friend_request.title',
                description: 'missions.list.social.steps.send_friend_request.description',
                listener: SendFriendRequestListener
            },
            {
                id: 'send_message',
                title: 'missions.list.social.steps.send_message.title',
                description: 'missions.list.social.steps.send_message.description',
                listener: SendMessageListener
            }
        ]
    },
    {
        id: 'manual_search_mission',
        title: 'missions.list.manual_search.title',
        description: 'missions.list.manual_search.description',
        icon: '🔍',
        dependsOn: ['profile_mission'],
        steps: [
            {
                id: 'open_airport_card',
                title: 'missions.list.manual_search.steps.open_airport_card.title',
                description: 'missions.list.manual_search.steps.open_airport_card.description',
                listener: OpenAirportCardListener
            },
            {
                id: 'add_airport',
                title: 'missions.list.manual_search.steps.add_airport.title',
                description: 'missions.list.manual_search.steps.add_airport.description',
                listener: AddAirportListener
            },
            {
                id: 'perform_manual_search',
                title: 'missions.list.manual_search.steps.perform_manual_search.title',
                description: 'missions.list.manual_search.steps.perform_manual_search.description',
                listener: ManualSearchStepListener
            }
        ]
    },
    {
        id: 'map_search_mission',
        title: 'missions.list.map_search.title',
        description: 'missions.list.map_search.description',
        icon: '🌍',
        dependsOn: ['flight_results_mission'],
        steps: [
            {
                id: 'open_map',
                title: 'missions.list.map_search.steps.open_map.title',
                description: 'missions.list.map_search.steps.open_map.description',
                listener: OpenMapListener
            },
            {
                id: 'select_on_map',
                title: 'missions.list.map_search.steps.select_on_map.title',
                description: 'missions.list.map_search.steps.select_on_map.description',
                listener: SelectOnMapListener
            },
            {
                id: 'perform_map_search',
                title: 'missions.list.map_search.steps.perform_map_search.title',
                description: 'missions.list.map_search.steps.perform_map_search.description',
                listener: ManualSearchStepListener
            }
        ]
    },
    {
        id: 'flight_results_mission',
        title: 'missions.list.flight_results.title',
        description: 'missions.list.flight_results.description',
        icon: '✈️',
        dependsOn: ['manual_search_mission'],
        steps: [
            {
                id: 'view_flight_details',
                title: 'missions.list.flight_results.steps.view_flight_details.title',
                description: 'missions.list.flight_results.steps.view_flight_details.description',
                listener: ViewFlightDetailsListener
            },
            {
                id: 'select_flight',
                title: 'missions.list.flight_results.steps.select_flight.title',
                description: 'missions.list.flight_results.steps.select_flight.description',
                listener: SelectFlightListener
            },
            {
                id: 'buy_flight',
                title: 'missions.list.flight_results.steps.buy_flight.title',
                description: 'missions.list.flight_results.steps.buy_flight.description',
                listener: BuyFlightListener
            }
        ]
    },
    {
        id: 'share_mission',
        title: 'missions.list.share.title',
        description: 'missions.list.share.description',
        icon: '📤',
        dependsOn: ['flight_results_mission', 'social_mission'],
        steps: [
            {
                id: 'share_from_results',
                title: 'missions.list.share.steps.share_from_results.title',
                description: 'missions.list.share.steps.share_from_results.description',
                listener: ShareFromResultsListener
            },
            {
                id: 'share_from_chat',
                title: 'missions.list.share.steps.share_from_chat.title',
                description: 'missions.list.share.steps.share_from_chat.description',
                listener: ShareFromChatListener
            }
        ]
    },
    {
        id: 'ai_mission',
        title: 'missions.list.ai.title',
        description: 'missions.list.ai.description',
        icon: '🤖',
        dependsOn: ['map_search_mission'],
        steps: [
            {
                id: 'use_ai',
                title: 'missions.list.ai.steps.use_ai.title',
                description: 'missions.list.ai.steps.use_ai.description',
                listener: AIChatStepListener
            },
            {
                id: 'get_search_history',
                title: 'missions.list.ai.steps.get_search_history.title',
                description: 'missions.list.ai.steps.get_search_history.description',
                listener: AIGetSearchHistoryListener
            },
            {
                id: 'receive_ai_flights',
                title: 'missions.list.ai.steps.receive_ai_flights.title',
                description: 'missions.list.ai.steps.receive_ai_flights.description',
                listener: AIFlightsReturnedListener
            }
        ]
    },
    {
        id: 'genetic_mission',
        title: 'missions.list.genetic.title',
        description: 'missions.list.genetic.description',
        icon: '🧬',
        dependsOn: ['map_search_mission'],
        steps: [
            {
                id: 'open_genetic_trip',
                title: 'missions.list.genetic.steps.open_genetic_trip.title',
                description: 'missions.list.genetic.steps.open_genetic_trip.description',
                listener: OpenGeneticTripListener
            },
            {
                id: 'add_itinerary_cities',
                title: 'missions.list.genetic.steps.add_itinerary_cities.title',
                description: 'missions.list.genetic.steps.add_itinerary_cities.description',
                listener: GeneticTripCityAddedListener
            },
            {
                id: 'perform_genetic_search',
                title: 'missions.list.genetic.steps.perform_genetic_search.title',
                description: 'missions.list.genetic.steps.perform_genetic_search.description',
                listener: GeneticTripPerformedListener
            }
        ]
    }
];

/**
 * i18next-parser hints
 * 
 * This block ensures that the parser detects the keys used in the MISSIONS constant,
 * as they are defined as static strings and not direct t() calls.
 * 
 * t('missions.list.registration.title')
 * t('missions.list.registration.description')
 * t('missions.list.registration.steps.complete_registration.title')
 * t('missions.list.registration.steps.complete_registration.description')
 * 
 * t('missions.list.profile.title')
 * t('missions.list.profile.description')
 * t('missions.list.profile.steps.upload_avatar.title')
 * t('missions.list.profile.steps.upload_avatar.description')
 * t('missions.list.profile.steps.edit_preferences.title')
 * t('missions.list.profile.steps.edit_preferences.description')
 * 
 * t('missions.list.social.title')
 * t('missions.list.social.description')
 * t('missions.list.social.steps.view_user_profile.title')
 * t('missions.list.social.steps.view_user_profile.description')
 * t('missions.list.social.steps.send_friend_request.title')
 * t('missions.list.social.steps.send_friend_request.description')
 * t('missions.list.social.steps.send_message.title')
 * t('missions.list.social.steps.send_message.description')
 * 
 * t('missions.list.manual_search.title')
 * t('missions.list.manual_search.description')
 * t('missions.list.manual_search.steps.open_airport_card.title')
 * t('missions.list.manual_search.steps.open_airport_card.description')
 * t('missions.list.manual_search.steps.add_airport.title')
 * t('missions.list.manual_search.steps.add_airport.description')
 * t('missions.list.manual_search.steps.perform_manual_search.title')
 * t('missions.list.manual_search.steps.perform_manual_search.description')
 * 
 * t('missions.list.map_search.title')
 * t('missions.list.map_search.description')
 * t('missions.list.map_search.steps.open_map.title')
 * t('missions.list.map_search.steps.open_map.description')
 * t('missions.list.map_search.steps.select_on_map.title')
 * t('missions.list.map_search.steps.select_on_map.description')
 * t('missions.list.map_search.steps.perform_map_search.title')
 * t('missions.list.map_search.steps.perform_map_search.description')
 * 
 * t('missions.list.flight_results.title')
 * t('missions.list.flight_results.description')
 * t('missions.list.flight_results.steps.view_flight_details.title')
 * t('missions.list.flight_results.steps.view_flight_details.description')
 * t('missions.list.flight_results.steps.select_flight.title')
 * t('missions.list.flight_results.steps.select_flight.description')
 * t('missions.list.flight_results.steps.buy_flight.title')
 * t('missions.list.flight_results.steps.buy_flight.description')
 * 
 * t('missions.list.share.title')
 * t('missions.list.share.description')
 * t('missions.list.share.steps.share_from_results.title')
 * t('missions.list.share.steps.share_from_results.description')
 * t('missions.list.share.steps.share_from_chat.title')
 * t('missions.list.share.steps.share_from_chat.description')
 * 
 * t('missions.list.ai.title')
 * t('missions.list.ai.description')
 * t('missions.list.ai.steps.use_ai.title')
 * t('missions.list.ai.steps.use_ai.description')
 * t('missions.list.ai.steps.get_search_history.title')
 * t('missions.list.ai.steps.get_search_history.description')
 * t('missions.list.ai.steps.receive_ai_flights.title')
 * t('missions.list.ai.steps.receive_ai_flights.description')
 * 
 * t('missions.list.genetic.title')
 * t('missions.list.genetic.description')
 * t('missions.list.genetic.steps.open_genetic_trip.title')
 * t('missions.list.genetic.steps.open_genetic_trip.description')
 * t('missions.list.genetic.steps.add_itinerary_cities.title')
 * t('missions.list.genetic.steps.add_itinerary_cities.description')
 * t('missions.list.genetic.steps.perform_genetic_search.title')
 * t('missions.list.genetic.steps.perform_genetic_search.description')
 */
