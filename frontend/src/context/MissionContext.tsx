import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useAuth } from './AuthContext';
import { MISSIONS } from '@/constants/missions';
import { Mission, MissionStep } from '@/types/missions';
import { toast } from 'sonner';
import ConsentModal from '@/components/missions/ConsentModal';
import SurveyModal from '@/components/missions/SurveyModal';
import FinalEvaluationModal from '@/components/missions/FinalEvaluationModal';
import MissionOnboarding from '@/components/missions/MissionOnboarding';
import { useSubmitResults } from '@/api/generated/openapi/evaluation';

interface SurveyAnswer {
    missionId: string;
    completedBy?: string;
    completedAt: string;
    userAgent: string;
    steps: {
        id: string;
        title: string;
        completedAt: string;
        userAgent: string;
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
    finishEvaluation: (fullName: string, susResults: number[]) => Promise<void>;
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

export const MissionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
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
                            completedBy: user?._id,
                            completedAt: new Date().toISOString(),
                            userAgent: navigator.userAgent
                        } : s
                    );
                    const allStepsCompleted = newSteps.every(s => s.isCompleted);
                    return {
                        ...m,
                        steps: newSteps,
                        isCompleted: allStepsCompleted,
                        completedBy: allStepsCompleted ? (user?._id || m.completedBy) : m.completedBy,
                        completedAt: allStepsCompleted ? (new Date().toISOString() || m.completedAt) : m.completedAt,
                        userAgent: allStepsCompleted ? (navigator.userAgent || m.userAgent) : m.userAgent
                    };
                }
                return m;
            });
        }

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
    const [surveyOnboardingStep, setSurveyOnboardingStep] = useState<number>(0);
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

    const acceptConsent = () => {
        localStorage.setItem(CONSENT_KEY, 'true');
        setHasConsented(true);
    };

    const nextOnboardingStep = useCallback(() => {
        setOnboardingStep(prev => {
            const next = prev + 1;
            if (next > 7) {
                localStorage.setItem(ONBOARDING_KEY, 'true');
                return 0;
            }
            return next;
        });
    }, []);

    const nextSurveyOnboardingStep = useCallback(() => {
        setSurveyOnboardingStep(prev => {
            const next = prev + 1;
            if (next > 3) {
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

    const isMissionUnlocked = useCallback((missionId: string) => {
        const mission = missions.find(m => m.id === missionId);
        if (!mission) return false;
        if (!mission.dependsOn || mission.dependsOn.length === 0) return true;
        return mission.dependsOn.every(depId => isMissionCompleted(depId));
    }, [missions, isMissionCompleted]);

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
                            toast.success(`¡Paso completado de la misión "${m.title}": ${s.title}`, {
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
                                completedAt: new Date().toISOString(),
                                userAgent: navigator.userAgent
                            };
                        }
                        return s;
                    });

                    const allStepsCompleted = newSteps.every(s => s.isCompleted);

                    if (allStepsCompleted && !m.isCompleted) {
                        toast.success(`🎉 Misión completada: ${m.title}`, {
                            id: `mission-${missionId}`,
                            duration: 5000
                        });

                        if (!hasSeenSurveyOnboarding && surveyOnboardingStep === 0) {
                            setSurveyOnboardingStep(1);
                        }
                    }

                    return {
                        ...m,
                        steps: newSteps,
                        isCompleted: allStepsCompleted,
                        completedBy: allStepsCompleted ? (user?._id || m.completedBy) : m.completedBy,
                        completedAt: allStepsCompleted ? (new Date().toISOString() || m.completedAt) : m.completedAt,
                        userAgent: allStepsCompleted ? (navigator.userAgent || m.userAgent) : m.userAgent
                    };
                });

                return newMissions;
            });
        });
    }, [user, evaluationFinished, hasSeenSurveyOnboarding, surveyOnboardingStep, isMissionUnlocked]);

    const unlockedMissions = useMemo(() => {
        return missions.filter(m => isMissionUnlocked(m.id));
    }, [missions, isMissionUnlocked]);

    const activeMission = useMemo(() => {
        return missions.find(m => !m.isCompleted && isMissionUnlocked(m.id)) || null;
    }, [missions, isMissionUnlocked]);

    const addSurveyAnswer = useCallback((missionId: string, answer: SurveyAnswer['answer']) => {
        const mission = missions.find(m => m.id === missionId)!;
        setSurveyAnswers(prev => [
            ...prev.filter(a => a.missionId !== missionId),
            {
                missionId,
                answer,
                completedBy: mission.completedBy!,
                completedAt: mission.completedAt!,
                userAgent: mission.userAgent!,
                steps: mission.steps.map(s => ({
                    id: s.id,
                    title: s.title,
                    completedAt: s.completedAt!,
                    userAgent: s.userAgent!
                })) || []
            }
        ]);
    }, [missions]);

    const isMissionRated = useCallback((missionId: string) => {
        return surveyAnswers.some(a => a.missionId === missionId);
    }, [surveyAnswers]);

    const finishEvaluation = async (fullName: string, susResults: number[]) => {
        try {
            await submitResultsMutation.mutateAsync({
                data: {
                    fullName,
                    results: surveyAnswers,
                    susResults,
                    timestamp: new Date().toISOString()
                }
            });

            setEvaluationFinished(true);
            toast.success('¡Evaluación completada!');
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
