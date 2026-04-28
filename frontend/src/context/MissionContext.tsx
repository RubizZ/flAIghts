import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useAuth } from './AuthContext';
import { MISSIONS } from '@/constants/missions';
import { Mission, MissionStep } from '@/types/missions';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import ConsentModal from '@/components/missions/ConsentModal';
import SurveyModal from '@/components/missions/SurveyModal';
import FinalEvaluationModal from '@/components/missions/FinalEvaluationModal';
import MissionOnboarding from '@/components/missions/MissionOnboarding';
import { useSubmitResults } from '@/api/generated/openapi/evaluation';
import { getGetSelfUserQueryKey } from '@/api/generated/openapi/users';
import queryClient from '@/api/query-client';

interface SurveyAnswer {
    missionId: string;
    completedBy?: string;
    completedAt: string;
    steps: {
        id: string;
        title: string;
        completedAt: string;
    }[];
    answer: {
        rating: number;
        comment: string;
    };
}

interface MissionContextType {
    missions: Mission[];
    completeStep: (missionId: string, stepId: string) => void;
    isMissionCompleted: (missionId: string) => boolean;
    isMissionUnlocked: (missionId: string) => boolean;
    unlockedMissions: Mission[];
    activeMission: Mission | null;
    allCompleted: boolean;
    isEvaluationMode: boolean;
    hasConsented: boolean;
    surveyAnswers: SurveyAnswer[];
    addSurveyAnswer: (missionId: string, answer: SurveyAnswer['answer']) => void;
    showSurveyMissionId: string | null;
    setShowSurveyMissionId: (id: string | null) => void;
    finishEvaluation: (fullName: string, susResults: number[], additionalData?: { age?: number, gender?: string, educationLevel?: string }) => Promise<void>;
    evaluationFinished: boolean;
    isMissionRated: (missionId: string) => boolean;
    showRoadmap: boolean;
    setShowRoadmap: (show: boolean) => void;
    onboardingStep: number;
    nextOnboardingStep: () => void;
    surveyOnboardingStep: number;
    nextSurveyOnboardingStep: () => void;
    skipOnboarding: () => void;
    declineConsent: () => void;
    reopenConsent: () => void;
}

const MissionContext = createContext<MissionContextType | undefined>(undefined);

const STORAGE_KEY = 'flaights_missions_state';
const CONSENT_KEY = 'flaights_evaluation_consent';
const ANSWERS_KEY = 'flaights_survey_answers';
const FINISHED_KEY = 'flaights_eval_finished';
const IS_EVAL_MODE = import.meta.env.VITE_EVALUATION_MODE === 'true';
const ONBOARDING_KEY = 'flaights_onboarding_seen';

/**
 * Función auxiliar para detectar ciclos en el grafo de misiones.
 * Lanza un error si encuentra una dependencia circular.
 */
function validateMissionCycles(missions: { id: string, dependsOn?: string[] }[]) {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    function hasCycle(id: string): boolean {
        if (recStack.has(id)) return true;
        if (visited.has(id)) return false;

        visited.add(id);
        recStack.add(id);

        const mission = missions.find(m => m.id === id);
        if (mission?.dependsOn) {
            for (const depId of mission.dependsOn) {
                if (hasCycle(depId)) return true;
            }
        }

        recStack.delete(id);
        return false;
    }

    for (const mission of missions) {
        if (hasCycle(mission.id)) {
            throw new Error(`Ciclo de dependencias detectado en el sistema de misiones: ${mission.id} forma parte de una referencia circular.`);
        }
    }
}

export const MissionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const { t } = useTranslation();
    const [missions, setMissions] = useState<Mission[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);

        // Transformar BaseMission[] a Mission[] inicial
        let initialMissions: Mission[] = MISSIONS.map(m => ({
            ...m,
            isCompleted: false,
            steps: m.steps.map(s => ({
                ...s,
                isCompleted: false
            }))
        }));

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                initialMissions = initialMissions.map(m => {
                    const savedMission = parsed.find((sm: Mission) => sm.id === m.id);
                    if (savedMission) {
                        return {
                            ...m,
                            isCompleted: savedMission.isCompleted,
                            completedBy: savedMission.completedBy,
                            completedAt: savedMission.completedAt,
                            steps: m.steps.map(s => {
                                const savedStep = savedMission.steps.find((ss: MissionStep) => ss.id === s.id);
                                return savedStep ? {
                                    ...s,
                                    isCompleted: savedStep.isCompleted,
                                    completedBy: savedStep.completedBy,
                                    completedAt: savedStep.completedAt
                                } : s;
                            })
                        };
                    }
                    return m;
                });
            } catch (e) {
                console.error('Error loading misiones desde localStorage:', e);
            }
        }

        // Si ya está autenticado pero la misión de registro no está marcada,
        // marcarla silenciosamente en el estado inicial para no mostrar toast
        if (isAuthenticated) {
            initialMissions = initialMissions.map(m => {
                if (m.id === 'registration_mission') {
                    const newSteps = m.steps.map(s =>
                        s.id === 'complete_registration' ? {
                            ...s,
                            isCompleted: true,
                            completedBy: user._id,
                            completedAt: new Date().toISOString()
                        } : s
                    );
                    const allStepsCompleted = newSteps.every(s => s.isCompleted);
                    return {
                        ...m,
                        steps: newSteps,
                        isCompleted: allStepsCompleted,
                        completedBy: allStepsCompleted ? (user._id || m.completedBy) : m.completedBy,
                        completedAt: allStepsCompleted ? (new Date().toISOString() || m.completedAt) : m.completedAt
                    };
                }
                return m;
            });
        }

        // Validar que no haya ciclos antes de retornar el estado inicial
        validateMissionCycles(initialMissions);

        return initialMissions;
    });

    const [hasConsented, setHasConsented] = useState(() => {
        return localStorage.getItem(CONSENT_KEY) === 'true';
    });

    const [surveyAnswers, setSurveyAnswers] = useState<SurveyAnswer[]>(() => {
        const saved = localStorage.getItem(ANSWERS_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const [evaluationFinished, setEvaluationFinished] = useState(() => {
        return localStorage.getItem(FINISHED_KEY) === 'true';
    });

    const [showSurveyMissionId, setShowSurveyMissionId] = useState<string | null>(null);
    const [showRoadmap, setShowRoadmap] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState<number>(() => {
        const seen = localStorage.getItem(ONBOARDING_KEY) === 'true';
        return seen ? 0 : 1;
    });
    const [surveyOnboardingStep, setSurveyOnboardingStep] = useState<number>(() => {
        const saved = localStorage.getItem('flaights_survey_onboarding_step');
        return saved ? parseInt(saved, 10) : 0;
    });

    // Sincronizar estado de misiones cuando el usuario se autentica
    useEffect(() => {
        if (isAuthenticated && user) {
            setMissions(prev => prev.map(m => {
                if (m.id === 'registration_mission' && !m.isCompleted) {
                    const newSteps = m.steps.map(s =>
                        s.id === 'complete_registration' ? {
                            ...s,
                            isCompleted: true,
                            completedBy: user._id,
                            completedAt: new Date().toISOString()
                        } : s
                    );
                    const allStepsCompleted = newSteps.every(s => s.isCompleted);
                    return {
                        ...m,
                        steps: newSteps,
                        isCompleted: allStepsCompleted,
                        completedBy: allStepsCompleted ? (user._id || m.completedBy) : m.completedBy,
                        completedAt: allStepsCompleted ? (new Date().toISOString() || m.completedAt) : m.completedAt
                    };
                }
                return m;
            }));
        }
    }, [isAuthenticated, user]);
    const [hasSeenSurveyOnboarding, setHasSeenSurveyOnboarding] = useState(() => {
        return localStorage.getItem('onboarding_survey_seen') === 'true';
    });

    const [isDeclined, setIsDeclined] = useState(() => {
        return localStorage.getItem('flaights_evaluation_declined') === 'true';
    });

    const submitResultsMutation = useSubmitResults();

    // Persistir estado
    useEffect(() => {
        const sanitizedMissions = missions.map(m => ({
            ...m,
            steps: m.steps.map(({ listener, ...s }) => s) // No guardamos los componentes funcionales
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedMissions));
    }, [missions]);

    useEffect(() => {
        localStorage.setItem(ANSWERS_KEY, JSON.stringify(surveyAnswers));
    }, [surveyAnswers]);

    useEffect(() => {
        localStorage.setItem(FINISHED_KEY, evaluationFinished.toString());
    }, [evaluationFinished]);

    useEffect(() => {
        localStorage.setItem('flaights_survey_onboarding_step', surveyOnboardingStep.toString());
    }, [surveyOnboardingStep]);

    const acceptConsent = () => {
        localStorage.setItem(CONSENT_KEY, 'true');
        setHasConsented(true);
    };

    const nextOnboardingStep = useCallback(() => {
        setOnboardingStep(prev => {
            const next = prev + 1;
            if (next > 7) {
                localStorage.setItem(ONBOARDING_KEY, 'true');
                // Si hay misiones completadas y no ha visto el tutorial de feedback, lo activamos ahora
                if (!hasSeenSurveyOnboarding && missions.some(m => m.isCompleted)) {
                    setSurveyOnboardingStep(1);
                }
                return 0;
            }
            return next;
        });
    }, [hasSeenSurveyOnboarding, missions]);

    const nextSurveyOnboardingStep = useCallback(() => {
        setSurveyOnboardingStep(prev => {
            const next = prev + 1;
            if (next > 4) {
                localStorage.setItem('onboarding_survey_seen', 'true');
                setHasSeenSurveyOnboarding(true);
                return 0;
            }
            return next;
        });
    }, []);

    const skipOnboarding = useCallback(() => {
        if (onboardingStep > 0) {
            localStorage.setItem(ONBOARDING_KEY, 'true');
            setOnboardingStep(0);
        }
        if (surveyOnboardingStep > 0) {
            localStorage.setItem('onboarding_survey_seen', 'true');
            setHasSeenSurveyOnboarding(true);
            setSurveyOnboardingStep(0);
        }
    }, [onboardingStep, surveyOnboardingStep]);

    const declineConsent = useCallback(() => {
        localStorage.setItem('flaights_evaluation_declined', 'true');
        setIsDeclined(true);
    }, []);

    const reopenConsent = useCallback(() => {
        setIsDeclined(false);
    }, []);

    const isMissionCompleted = useCallback((missionId: string) => {
        return missions.find(m => m.id === missionId)?.isCompleted || false;
    }, [missions]);

    const isMissionUnlocked = useCallback((missionId: string): boolean => {
        const memo = new Map<string, boolean>();
        const check = (id: string, recStack: Set<string>): boolean => {
            if (recStack.has(id)) {
                throw new Error(`Ciclo detectado en tiempo de ejecución para la misión: ${id}`);
            }
            if (memo.has(id)) return memo.get(id)!;

            const mission = missions.find(m => m.id === id);
            if (!mission) return false;

            recStack.add(id);

            if (!mission.dependsOn || mission.dependsOn.length === 0) {
                memo.set(id, true);
                recStack.delete(id);
                return true;
            }

            const isAllDepsMet = mission.dependsOn.every(depId => {
                const depMission = missions.find(m => m.id === depId);
                return !!(depMission && depMission.isCompleted && check(depId, recStack));
            });

            memo.set(id, isAllDepsMet);
            recStack.delete(id);
            return isAllDepsMet;
        };

        return check(missionId, new Set());
    }, [missions]);

    const completeStep = useCallback((missionId: string, stepId: string) => {
        if (evaluationFinished) return;

        // No permitir completar pasos si la misión está bloqueada
        if (!isMissionUnlocked(missionId)) {
            console.warn(`Intento de completar paso "${stepId}" en misión bloqueada "${missionId}"`);
            return;
        }

        // Usamos flushSync para que la actualización de estado sea síncrona.
        // Esto garantiza que los listeners (componentes) sean desmontados 
        // INSTANTÁNEAMENTE antes de que React Strict Mode pueda disparar una 
        // segunda llamada para la misma tarea, eliminando la duplicidad.
        flushSync(() => {
            setMissions(prevMissions => {
                const mission = prevMissions.find(m => m.id === missionId);
                if (!mission) return prevMissions;

                const step = mission.steps.find(s => s.id === stepId);
                if (!step || step.isCompleted) return prevMissions;

                const newMissions = prevMissions.map((m: Mission) => {
                    if (m.id !== missionId) return m;

                    const newSteps = m.steps.map((s: MissionStep) => {
                        if (s.id === stepId) {
                            // Toast con ID único para deduplicación automática
                            toast.success(t("fixes.stepCompleted", { mission: t(m.title), step: t(s.title) }), {
                                id: `step-${missionId}-${stepId}`,
                                icon: '✨',
                                style: {
                                    background: 'rgba(30, 41, 59, 0.8)',
                                    backdropFilter: 'blur(10px)',
                                    color: '#fff',
                                    borderColor: 'rgba(255, 255, 255, 0.1)'
                                }
                            });
                            return {
                                ...s,
                                isCompleted: true,
                                completedBy: user?._id,
                                completedAt: new Date().toISOString()
                            };
                        }
                        return s;
                    });

                    const allStepsCompleted = newSteps.every(s => s.isCompleted);

                    if (allStepsCompleted && !m.isCompleted) {
                        toast.success(`${t('missions.dashboard.missionPassed')}: ${t(m.title)}`, {
                            id: `mission-${missionId}`,
                            icon: '🎉',
                            duration: 5000,
                            style: {
                                background: 'rgba(16, 45, 32, 0.8)',
                                backdropFilter: 'blur(10px)',
                                color: '#fff',
                                borderColor: 'rgba(52, 211, 153, 0.2)'
                            }
                        });

                        if (!hasSeenSurveyOnboarding && surveyOnboardingStep === 0 && onboardingStep === 0) {
                            setSurveyOnboardingStep(1);
                        }
                    }

                    return {
                        ...m,
                        steps: newSteps,
                        isCompleted: allStepsCompleted,
                        completedBy: allStepsCompleted ? (user?._id || m.completedBy) : m.completedBy,
                        completedAt: allStepsCompleted ? (new Date().toISOString() || m.completedAt) : m.completedAt
                    };
                });

                return newMissions;
            });
        });
    }, [user, evaluationFinished, isMissionUnlocked, hasSeenSurveyOnboarding, surveyOnboardingStep]);

    const unlockedMissions = useMemo(() => {
        return missions.filter(m => isMissionUnlocked(m.id));
    }, [missions, isMissionUnlocked]);

    const activeMission = useMemo(() => {
        return missions.find(m => !m.isCompleted && isMissionUnlocked(m.id)) || null;
    }, [missions, isMissionUnlocked]);

    const addSurveyAnswer = useCallback((missionId: string, answer: SurveyAnswer['answer']) => {
        const mission = missions.find(m => m.id === missionId)!;

        // Si es el primer feedback y estamos en el tutorial, avanzamos al siguiente paso
        if (surveyAnswers.length === 0 && surveyOnboardingStep === 3) {
            nextSurveyOnboardingStep();
        }

        setSurveyAnswers(prev => [
            ...prev.filter(a => a.missionId !== missionId),
            {
                missionId,
                answer,
                completedBy: mission.completedBy,
                completedAt: mission.completedAt!,
                steps: mission.steps.map(s => ({
                    id: s.id,
                    title: t(s.title),
                    completedAt: s.completedAt!
                }))
            }
        ]);
    }, [missions, surveyAnswers.length, surveyOnboardingStep, nextSurveyOnboardingStep]);

    const isMissionRated = useCallback((missionId: string) => {
        return surveyAnswers.some(a => a.missionId === missionId);
    }, [surveyAnswers]);

    const finishEvaluation = async (fullName: string, susResults: number[], additionalData: { age?: number, gender?: string, educationLevel?: string } = {}) => {
        try {
            await submitResultsMutation.mutateAsync({
                data: {
                    fullName,
                    results: surveyAnswers,
                    susResults,
                    timestamp: new Date().toISOString(),
                    screenInfo: {
                        width: window.screen.width,
                        height: window.screen.height,
                        innerWidth: window.innerWidth,
                        innerHeight: window.innerHeight,
                        devicePixelRatio: window.devicePixelRatio
                    },
                    userAgent: navigator.userAgent,
                    ...additionalData
                }
            });

            setEvaluationFinished(true);
            toast.success(t('home.toast.evaluationCompleted'));

            // Invalidad datos del usuario para mostrar la nueva insignia
            queryClient.invalidateQueries({ queryKey: getGetSelfUserQueryKey() });
        } catch (error) {
            console.error('Error al finalizar:', error);
            setEvaluationFinished(true);
        }
    };

    const allCompleted = missions.every(m => m.isCompleted);

    return (
        <MissionContext.Provider value={{
            missions,
            completeStep,
            isMissionCompleted,
            isMissionUnlocked,
            unlockedMissions,
            activeMission,
            allCompleted,
            isEvaluationMode: IS_EVAL_MODE,
            hasConsented,
            surveyAnswers,
            addSurveyAnswer,
            showSurveyMissionId,
            setShowSurveyMissionId,
            finishEvaluation,
            evaluationFinished,
            isMissionRated,
            showRoadmap,
            setShowRoadmap,
            onboardingStep,
            nextOnboardingStep,
            surveyOnboardingStep,
            nextSurveyOnboardingStep,
            skipOnboarding,
            declineConsent,
            reopenConsent
        }}>
            {IS_EVAL_MODE && (
                <>
                    {!hasConsented && !isDeclined && <ConsentModal onAccept={acceptConsent} />}
                    {hasConsented && (
                        <>
                            {(onboardingStep > 0 || surveyOnboardingStep > 0) && <MissionOnboarding />}
                            {showSurveyMissionId && <SurveyModal key={showSurveyMissionId} />}
                            <FinalEvaluationModal />
                            {/* Renderizar listeners solo de misiones desbloqueadas */}
                            {missions.map(m =>
                                isMissionUnlocked(m.id) && m.steps.map(step => {
                                    if (step.listener && !step.isCompleted) {
                                        const Listener = step.listener;
                                        return <Listener key={step.id} />;
                                    }
                                    return null;
                                })
                            )}
                        </>
                    )}
                </>
            )}
            {children}
        </MissionContext.Provider>
    );
};

export const useMissions = () => {
    const context = useContext(MissionContext);
    if (!context) throw new Error('useMissions must be used within a MissionProvider');
    return context;
};
