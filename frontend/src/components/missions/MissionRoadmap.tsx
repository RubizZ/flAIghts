import React, { useState, useLayoutEffect, useRef } from 'react';
import { useMissions } from '@/context/MissionContext';
import { X, Lock, CheckCircle2, MessageSquareText, Trophy } from 'lucide-react';

interface MissionRoadmapProps {
    onClose: () => void;
    onMissionClick?: (missionId: string) => void;
}

const MissionRoadmap: React.FC<MissionRoadmapProps> = ({ onClose, onMissionClick }) => {
    const { missions, isMissionUnlocked, isMissionCompleted, isMissionRated, activeMission, onboardingStep, surveyOnboardingStep } = useMissions();
    const [isClosing, setIsClosing] = useState(false);
    const [connections, setConnections] = useState<Array<{
        x1: number; y1: number; x2: number; y2: number;
        completed: boolean; unlocked: boolean;
        levelDiff: number;
    } & { toId: string, hasObstacle?: boolean }>>([]);
    const [hoveredMissionId, setHoveredMissionId] = useState<string | null>(null);
    const graphRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Drag to scroll state
    const isDragging = useRef(false);
    const startX = useRef(0);
    const startY = useRef(0);
    const scrollLeftInitial = useRef(0);
    const scrollTopInitial = useRef(0);
    const [isGrabbing, setIsGrabbing] = useState(false);
    const [isGraphReady, setIsGraphReady] = useState(false);
    const backdropMouseDown = useRef(false);

    const updateConnections = React.useCallback(() => {
        const newConnections: typeof connections = [];
        const graphNode = graphRef.current;
        if (!graphNode) return;

        const graphRect = graphNode.getBoundingClientRect();

        // Primero calculamos niveles para saber si saltamos alguno
        const getDepth = (id: string, v = new Set<string>()): number => {
            const m = missions.find(mi => mi.id === id);
            if (!m || !m.dependsOn || m.dependsOn.length === 0) return 0;
            if (v.has(id)) return 0;
            v.add(id);
            return 1 + Math.max(...m.dependsOn.map(depId => getDepth(depId, v)));
        };

        const missionLevels = missions.reduce((acc, m) => {
            acc[m.id] = getDepth(m.id);
            return acc;
        }, {} as Record<string, number>);

        missions.forEach(mission => {
            if (mission.dependsOn) {
                mission.dependsOn.forEach(depId => {
                    const fromEl = document.getElementById(`roadmap-mission-${depId}`);
                    const toEl = document.getElementById(`roadmap-mission-${mission.id}`);

                    if (fromEl && toEl) {
                        const fromRect = fromEl.getBoundingClientRect();
                        const toRect = toEl.getBoundingClientRect();
                        const x1 = fromRect.left + fromRect.width / 2 - graphRect.left;
                        const x2 = toRect.left + toRect.width / 2 - graphRect.left;
                        const fromLevel = missionLevels[depId] ?? 0;
                        const toLevel = missionLevels[mission.id] ?? 0;

                        // Detección de obstáculos entre niveles
                        const hasObstacle = missions.some(m => {
                            const mLevel = missionLevels[m.id] ?? 0;
                            if (mLevel > fromLevel && mLevel < toLevel) {
                                const el = document.getElementById(`roadmap-mission-${m.id}`);
                                if (el) {
                                    const r = el.getBoundingClientRect();
                                    const left = r.left - graphRect.left;
                                    const right = r.right - graphRect.left;

                                    // Interpolación simple de X para este nivel
                                    const t = (mLevel - fromLevel) / (toLevel - fromLevel);
                                    const lineX = x1 + (x2 - x1) * t;

                                    // Si la línea pasa por encima de la card (con margen)
                                    return lineX >= (left - 20) && lineX <= (right + 20);
                                }
                            }
                            return false;
                        });

                        newConnections.push({
                            x1,
                            y1: fromRect.bottom - graphRect.top,
                            x2,
                            y2: toRect.top - graphRect.top,
                            completed: isMissionCompleted(depId),
                            unlocked: isMissionUnlocked(mission.id),
                            levelDiff: toLevel - fromLevel,
                            toId: mission.id,
                            hasObstacle
                        });
                    }
                });
            }
        });
        setConnections(newConnections);
        if (missions.length > 0) {
            setIsGraphReady(true);
        }
    }, [missions, isMissionCompleted, isMissionUnlocked]);

    useLayoutEffect(() => {
        updateConnections();

        // Múltiples re-cálculos para capturar el final de la animación zoom-in
        const timers = [100, 300, 500, 800].map(ms => setTimeout(updateConnections, ms));

        // Observador de cambio de tamaño para el contenedor del grafo
        const resizeObserver = new ResizeObserver(() => {
            updateConnections();
        });

        if (graphRef.current) {
            resizeObserver.observe(graphRef.current);
        }

        // Listener de resize global como backup
        window.addEventListener('resize', updateConnections);

        return () => {
            timers.forEach(clearTimeout);
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateConnections);
        };
    }, [updateConnections]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current || onboardingStep > 0 || surveyOnboardingStep > 0) return;
        isDragging.current = true;
        setIsGrabbing(true);
        startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
        startY.current = e.pageY - scrollContainerRef.current.offsetTop;
        scrollLeftInitial.current = scrollContainerRef.current.scrollLeft;
        scrollTopInitial.current = scrollContainerRef.current.scrollTop;
    };

    const handleWindowMouseMove = React.useCallback((e: MouseEvent) => {
        const container = scrollContainerRef.current;
        if (!isDragging.current || !container) return;

        const x = e.pageX - container.offsetLeft;
        const y = e.pageY - container.offsetTop;

        const walkX = x - startX.current;
        const walkY = y - startY.current;

        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        const maxScrollTop = container.scrollHeight - container.clientHeight;

        const nextScrollLeft = scrollLeftInitial.current - walkX;
        const nextScrollTop = scrollTopInitial.current - walkY;

        if (nextScrollLeft < 0 || nextScrollLeft > maxScrollLeft) {
            startX.current = x;
            scrollLeftInitial.current = container.scrollLeft;
        } else {
            container.scrollLeft = nextScrollLeft;
        }

        if (nextScrollTop < 0 || nextScrollTop > maxScrollTop) {
            startY.current = y;
            scrollTopInitial.current = container.scrollTop;
        } else {
            container.scrollTop = nextScrollTop;
        }
    }, []);

    const handleWindowMouseUp = React.useCallback(() => {
        isDragging.current = false;
        setIsGrabbing(false);
    }, []);

    React.useEffect(() => {
        if (isGrabbing) {
            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowMouseUp);
        } else {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [isGrabbing, handleWindowMouseMove, handleWindowMouseUp]);

    // Auto-scroll to center on the most relevant mission
    React.useEffect(() => {
        // Wait for graph to be ready so positions are calculated
        if (!isGraphReady || !scrollContainerRef.current) return;

        // Priority: 1. Mission needing feedback, 2. Next available mission
        const missionToFocus = missionsWithLevels.find(m => isMissionCompleted(m.id) && !isMissionRated(m.id))
            || missionsWithLevels.find(m => isMissionUnlocked(m.id) && !isMissionCompleted(m.id));

        if (missionToFocus) {
            const element = document.getElementById(`roadmap-mission-${missionToFocus.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
        }
    }, [isGraphReady]);

    const handleMissionClick = (id: string) => {
        setIsClosing(true);
        setTimeout(() => onMissionClick?.(id), 300);
    };

    // Calcular niveles (capas) del grafo de forma simple
    const getMissionDepth = (missionId: string, visited = new Set<string>()): number => {
        const mission = missions.find(m => m.id === missionId);
        if (!mission || !mission.dependsOn || mission.dependsOn.length === 0) return 0;

        // Evitar bucles infinitos
        if (visited.has(missionId)) return 0;
        visited.add(missionId);

        return 1 + Math.max(...mission.dependsOn.map(depId => getMissionDepth(depId, visited)));
    };

    const missionsWithLevels = missions.map(m => ({
        ...m,
        level: getMissionDepth(m.id)
    }));

    const maxLevel = Math.max(...missionsWithLevels.map(m => m.level), 0);
    const levels = Array.from({ length: maxLevel + 1 }, (_, i) => i);

    const firstLockedMission = missionsWithLevels.find(m => !isMissionUnlocked(m.id));
    const firstCompletedMission = missionsWithLevels.find(m => isMissionCompleted(m.id) && !isMissionRated(m.id));

    return (
        <div
            className={`fixed inset-0 z-modal flex items-center justify-center backdrop-blur-sm animate-duration-500 p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) backdropMouseDown.current = true;
            }}
            onMouseUp={(e) => {
                if (e.target === e.currentTarget && backdropMouseDown.current) {
                    handleClose();
                }
                backdropMouseDown.current = false;
            }}
        >
            <div className={`relative w-[95vw] sm:w-full max-w-7xl h-[85vh] sm:h-[90vh] overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-gray-950 p-4 sm:p-10 shadow-2xl animate-duration-300 flex flex-col ${isClosing ? 'animate-zoom-out' : 'animate-zoom-in'}`}>
                <button
                    id="roadmap-close-button"
                    onClick={handleClose}
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-white/5 text-white/50 hover:text-rose-500 hover:bg-rose-500/10 transition-all z-content cursor-pointer"
                >
                    <X size={24} />
                </button>

                <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 px-4 pr-12 sm:px-0 sm:pr-20">
                    <div className="text-center sm:text-left">
                        <h2 className="text-2xl sm:text-4xl font-black mb-1 sm:mb-2 tracking-tight bg-linear-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Roadmap de Evaluación</h2>
                        <p className="text-[10px] sm:text-sm text-gray-400 font-medium italic">Progreso de los retos de usabilidad. Completa todas las misiones y responde a los cuestionarios para terminar la evaluación</p>
                    </div>

                    <div className="flex items-center gap-3 px-5 py-2 rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-md">
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Misiones</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl sm:text-2xl font-black text-white">{missions.filter(m => isMissionCompleted(m.id)).length}</span>
                                <span className="text-xs font-bold text-white/20">/ {missions.length}</span>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-white/10 mx-1"></div>
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${missions.every(m => isMissionCompleted(m.id)) ? 'bg-green-500/20 text-green-400 border-green-500/20' : 'bg-blue-500/20 text-blue-400 border-blue-500/20'}`}>
                            <Trophy size={20} />
                        </div>
                    </div>
                </div>

                <div
                    ref={scrollContainerRef}
                    id="roadmap-scroll-container"
                    className={`flex-1 overflow-auto custom-scrollbar p-2 sm:p-10 relative select-none ${isGrabbing ? 'cursor-grabbing' : 'cursor-grab'}`}
                    onMouseDown={handleMouseDown}
                    style={{ scrollBehavior: isGrabbing ? 'auto' : 'smooth' }}
                >
                    <div
                        ref={graphRef}
                        className="flex flex-col gap-16 sm:gap-40 items-start min-w-max py-10 sm:py-20 px-4 sm:px-8 relative transition-transform duration-300 ease-out"
                    >
                        {/* SVG Connections Overlay */}
                        {/* SVG Connections Overlay - Markers removed to allow smooth transitions */}
                        <svg
                            className={`absolute inset-0 pointer-events-none z-behind w-full h-full min-w-full min-h-full overflow-visible transition-opacity duration-500 ${isGraphReady ? 'opacity-100' : 'opacity-0'}`}
                        >
                            {connections.map((conn, i) => {
                                // Bezier points para una curva más orgánica y fluida
                                const distY = conn.y2 - conn.y1;
                                const tension = distY * 0.4;
                                let d = "";

                                if (!conn.hasObstacle) {
                                    d = `M ${conn.x1},${conn.y1} 
                                         C ${conn.x1},${conn.y1 + tension} ${conn.x2},${conn.y2 - tension} ${conn.x2},${conn.y2 - 8}`;
                                } else {
                                    // Si hay obstáculo, usamos el pasillo lateral
                                    const railX = Math.max(conn.x1, conn.x2) + 280;
                                    const midY = conn.y1 + (distY / 2);
                                    d = `M ${conn.x1},${conn.y1} 
                                         C ${conn.x1},${conn.y1 + 60} ${railX},${conn.y1 + 30} ${railX},${midY}
                                         C ${railX},${conn.y2 - 30} ${conn.x2},${conn.y2 - 60} ${conn.x2},${conn.y2 - 8}`;
                                }

                                const colorClass = conn.completed
                                    ? 'text-green-500'
                                    : conn.unlocked
                                        ? 'text-blue-500'
                                        : conn.toId === hoveredMissionId
                                            ? 'text-rose-500/80'
                                            : 'text-white/10';

                                return (
                                    <g key={i} className={`transition-all duration-300 ${colorClass}`}>
                                        <path
                                            d={d}
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeDasharray={conn.unlocked ? "" : "4 4"}
                                            className="transition-all duration-300"
                                        />
                                        {/* Manual Arrowhead for smooth transition */}
                                        <path
                                            d={`M ${conn.x2 - 5},${conn.y2 - 8} L ${conn.x2 + 5},${conn.y2 - 8} L ${conn.x2},${conn.y2} Z`}
                                            fill="currentColor"
                                            className="transition-all duration-300"
                                        />
                                    </g>
                                );
                            })}
                        </svg>
                        {levels.map(level => {
                            const levelMissions = missionsWithLevels.filter(m => m.level === level);
                            return (
                                <div
                                    key={level}
                                    className="flex flex-row gap-10 items-center justify-start relative w-max z-content pl-10 sm:pl-20"
                                >
                                    {levelMissions.map(mission => {
                                        const unlocked = isMissionUnlocked(mission.id);
                                        const completed = isMissionCompleted(mission.id);
                                        const rated = isMissionRated(mission.id);
                                        const needsRating = completed && !rated;

                                        return (
                                            <div
                                                key={mission.id}
                                                id={mission.id === firstCompletedMission?.id ? 'onboarding-survey-mission' : (mission.id === activeMission?.id ? 'onboarding-active-mission' : (mission.id === firstLockedMission?.id ? 'roadmap-locked-mission' : undefined))}
                                                className={`relative group ${unlocked || completed ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                                onClick={() => (unlocked || completed) && handleMissionClick(mission.id)}
                                                onMouseEnter={() => setHoveredMissionId(mission.id)}
                                                onMouseLeave={() => setHoveredMissionId(null)}
                                            >
                                                {/* Node Card */}
                                                <div
                                                    id={`roadmap-mission-${mission.id}`}
                                                    className={`w-72 sm:w-96 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all duration-300 relative z-20 shadow-2xl ${completed
                                                        ? 'bg-gray-950 border-green-500/30 hover:border-green-500/50'
                                                        : unlocked
                                                            ? 'bg-gray-950 border-blue-500/30 shadow-blue-500/5'
                                                            : 'bg-gray-950/50 border-white/10 grayscale opacity-40'
                                                        } ${needsRating ? 'animate-soft-pulse border-amber-500/50 shadow-amber-500/20' : ''}`}>

                                                    {/* Background overlay for color without losing opacity */}
                                                    <div className={`absolute inset-0 rounded-[inherit] -z-10 transition-colors duration-300 ${completed ? 'bg-green-500/5 group-hover:bg-green-500/10' : unlocked ? 'bg-blue-500/5 group-hover:bg-blue-500/10' : ''}`} />
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className={`h-12 w-12 flex items-center justify-center rounded-2xl text-xl ${completed ? 'bg-green-500/20 text-green-400' :
                                                            unlocked ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'
                                                            }`}>
                                                            {completed ? <CheckCircle2 size={24} /> : <span>{mission.icon}</span>}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <h4 className="font-bold text-white truncate text-base">{mission.title}</h4>
                                                                {needsRating && (
                                                                    <div className="bg-amber-500 text-black p-1 rounded-md animate-soft-pulse">
                                                                        <MessageSquareText size={14} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${completed ? 'text-green-500/70' :
                                                                unlocked ? 'text-blue-500/70' : 'text-gray-500'
                                                                }`}>
                                                                {completed ? 'Completado' : unlocked ? 'Disponible' : 'Cerrado'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-400 leading-relaxed mb-5">
                                                        {mission.description}
                                                    </p>

                                                    {/* Steps preview in roadmap */}
                                                    <div className="flex gap-1.5 mt-auto">
                                                        {mission.steps.map((step) => (
                                                            <div
                                                                key={step.id}
                                                                className={`h-1 flex-1 rounded-full ${step.isCompleted ? 'bg-green-500' : 'bg-white/10'}`}
                                                            />
                                                        ))}
                                                    </div>

                                                </div>

                                                {/* Lock icon overlay */}
                                                {!unlocked && (
                                                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                                                        <div className="bg-black/20 backdrop-blur-[2px] p-3 rounded-full border border-white/5">
                                                            <Lock size={24} className="text-white/20" />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Floating Survey Alert */}
                                                {needsRating && (
                                                    <div className="absolute -top-3 -right-3 z-30 bg-amber-500 px-3 py-1 rounded-full text-[9px] font-black text-black shadow-lg shadow-amber-900/40 uppercase tracking-widest border border-amber-400">
                                                        Pendiente Feedback
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] sm:text-xs text-gray-500">
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            <span>Conseguida</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                            <span>En curso</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                            <span>Feedback</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/20"></div>
                            <span>Bloqueada</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MissionRoadmap;
