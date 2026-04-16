import React, { useState, useEffect, useMemo } from 'react';
import { useMissions } from '@/context/MissionContext';
import { Trophy, ChevronRight, Sparkles, Target, LayoutGrid, ListChecks, Map, Lock, X as CloseIcon, MessageSquareQuote } from 'lucide-react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

const MissionOnboarding: React.FC = () => {
    const {
        isEvaluationMode, hasConsented, onboardingStep, nextOnboardingStep,
        surveyOnboardingStep, nextSurveyOnboardingStep, showRoadmap, skipOnboarding
    } = useMissions();

    const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

    const [subStep, setSubStep] = useState(0);

    // Determinar qué tour está activo
    const activeTourStep = onboardingStep > 0 ? onboardingStep : surveyOnboardingStep;
    const isSurveyTour = onboardingStep === 0 && surveyOnboardingStep > 0;

    useEffect(() => {
        setIsTransitioning(true);
        const timer = setTimeout(() => setIsTransitioning(false), 800);
        return () => clearTimeout(timer);
    }, [activeTourStep]);

    useEffect(() => {
        setSubStep(0);
    }, [onboardingStep, surveyOnboardingStep]);

    useEffect(() => {
        const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobileTarget = useMemo(() => {
        const isStep1 = (isSurveyTour && surveyOnboardingStep === 1) || (!isSurveyTour && onboardingStep === 1);
        if (!isStep1) return false;

        const desktopBtn = document.getElementById('nav-missions-button');
        // Si no existe o no tiene ancho (está oculto por media query)
        return !desktopBtn || desktopBtn.offsetWidth === 0;
    }, [onboardingStep, surveyOnboardingStep, isSurveyTour, viewport]);

    useEffect(() => {
        if (isEvaluationMode && hasConsented && activeTourStep > 0) {
            const findTarget = () => {
                let currentId = '';

                if (isSurveyTour) {
                    switch (surveyOnboardingStep) {
                        case 1:
                            if (isMobileTarget) {
                                currentId = subStep === 0 ? (document.getElementById('nav-user-menu-trigger') ? 'nav-user-menu-trigger' : 'nav-options-menu-trigger') : (document.getElementById('nav-missions-button-mobile') ? 'nav-missions-button-mobile' : 'nav-missions-button-mobile-alt');
                            } else {
                                currentId = 'nav-missions-button';
                            }
                            break;
                        case 2: currentId = 'onboarding-survey-mission'; break;
                        case 3: currentId = 'dashboard-survey-button'; break;
                    }
                } else {
                    switch (onboardingStep) {
                        case 1:
                            if (isMobileTarget) {
                                currentId = subStep === 0 ? (document.getElementById('nav-user-menu-trigger') ? 'nav-user-menu-trigger' : 'nav-options-menu-trigger') : (document.getElementById('nav-missions-button-mobile') ? 'nav-missions-button-mobile' : 'nav-missions-button-mobile-alt');
                            } else {
                                currentId = 'nav-missions-button';
                            }
                            break;
                        case 2: currentId = 'onboarding-active-mission'; break;
                        case 3: currentId = 'dashboard-left-summary'; break;
                        case 4: currentId = 'dashboard-right-checklist'; break;
                        case 5: currentId = 'dashboard-back-button'; break;
                        case 6: currentId = 'roadmap-locked-mission'; break;
                        case 7: currentId = 'roadmap-close-button'; break;
                    }
                }

                const element = currentId ? document.getElementById(currentId) : null;

                if (element) {
                    setSpotlightRect(element.getBoundingClientRect());
                    setIsVisible(true);
                } else {
                    // Si es el paso de misión bloqueada y no hay ninguna, saltamos
                    if (currentId === 'roadmap-locked-mission') {
                        nextOnboardingStep();
                        return;
                    }
                    setSpotlightRect(null);
                    setIsVisible(false);
                }
            };

            findTarget();

            // Listen to scroll in both containers
            const scrollContainer = document.getElementById('roadmap-scroll-container');
            const dashboardContainer = document.querySelector('.custom-scrollbar');
            const handleUpdate = () => findTarget();

            if (scrollContainer) scrollContainer.addEventListener('scroll', handleUpdate);
            if (dashboardContainer) dashboardContainer.addEventListener('scroll', handleUpdate);

            // Frequent check for dynamic transitions
            const timer = setTimeout(findTarget, 400);
            const interval = setInterval(findTarget, 800);

            return () => {
                clearTimeout(timer);
                clearInterval(interval);
                if (scrollContainer) scrollContainer.removeEventListener('scroll', handleUpdate);
                if (dashboardContainer) dashboardContainer.removeEventListener('scroll', handleUpdate);
            };
        } else {
            setIsVisible(false);
        }
    }, [isEvaluationMode, hasConsented, onboardingStep, surveyOnboardingStep, showRoadmap, isSurveyTour, isMobileTarget, subStep, nextOnboardingStep]);

    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            if (activeTourStep === 0 || !spotlightRect) return;

            // Definir qué pasos avanzan por clic directo
            let isDirectAction = false;
            if (isSurveyTour) {
                isDirectAction = [1, 2, 3].includes(surveyOnboardingStep);
            } else {
                isDirectAction = [1, 2, 5, 7].includes(onboardingStep);
            }

            if (!isDirectAction) return;

            const margin = 10;
            const isInside = e.clientX >= spotlightRect.left - margin &&
                e.clientX <= spotlightRect.right + margin &&
                e.clientY >= spotlightRect.top - margin &&
                e.clientY <= spotlightRect.bottom + margin;

            if (isInside) {
                // Si estamos en el paso 1 móvil y en el sub-paso 0 (abriendo menú)
                if (isMobileTarget && subStep === 0) {
                    setTimeout(() => setSubStep(1), 50);
                    return;
                }

                // El clic fue en el objetivo, avanzamos de paso.
                if (isSurveyTour) setTimeout(nextSurveyOnboardingStep, 50);
                else setTimeout(nextOnboardingStep, 50);
            }
        };

        window.addEventListener('click', handleGlobalClick, true);
        return () => window.removeEventListener('click', handleGlobalClick, true);
    }, [onboardingStep, surveyOnboardingStep, spotlightRect, nextOnboardingStep, nextSurveyOnboardingStep, isSurveyTour, activeTourStep, isMobileTarget, subStep]);

    // Lógica de posicionamiento inteligente
    const { tooltipStyle, arrowClasses, arrowStyle } = useMemo(() => {
        if (!spotlightRect) return { tooltipStyle: {}, arrowClasses: '', arrowStyle: {} };

        const TW = 360; // Max default width
        const TH = 240; // Approx height for fit calculation
        const Gap = 24;
        const Padding = 16;
        const cx = spotlightRect.left + spotlightRect.width / 2;
        const cy = spotlightRect.top + spotlightRect.height / 2;
        const rw = spotlightRect.width / 2;
        const rh = spotlightRect.height / 2;

        let bestPos: TooltipPosition = 'bottom';

        const canFitBottom = cy + rh + Gap + TH < viewport.h;
        const canFitTop = cy - rh - Gap - TH > 0;
        const canFitRight = cx + rw + Gap + TW < viewport.w;
        const canFitLeft = cx - rw - Gap - TW > 0;

        if (canFitBottom) bestPos = 'bottom';
        else if (canFitTop) bestPos = 'top';
        else if (canFitRight) bestPos = 'right';
        else if (canFitLeft) bestPos = 'left';

        const actualWidth = Math.min(viewport.w - (Padding * 2), TW);
        const style: React.CSSProperties = { width: actualWidth };
        let arrows = '';
        const arrowPosStyle: React.CSSProperties = {};

        switch (bestPos) {
            case 'bottom':
                style.top = cy + rh + Gap;
                // Clamp horizontal position
                const leftPos = Math.max(actualWidth / 2 + Padding, Math.min(viewport.w - actualWidth / 2 - Padding, cx));
                style.left = leftPos;
                style.transform = 'translateX(-50%)';
                style.animation = 'float-vertical 3s ease-in-out infinite';

                // Adjust arrow to point to cx
                const arrowLeftDist = cx - (leftPos - actualWidth / 2);
                arrowPosStyle.left = `${(arrowLeftDist / actualWidth) * 100}%`;
                arrows = "top-[-8px] -translate-x-1/2 border-t border-l rotate-45";
                break;
            case 'top':
                style.bottom = (viewport.h - (cy - rh)) + Gap;
                const leftPosTop = Math.max(actualWidth / 2 + Padding, Math.min(viewport.w - actualWidth / 2 - Padding, cx));
                style.left = leftPosTop;
                style.transform = 'translateX(-50%)';
                style.animation = 'float-vertical-rev 3s ease-in-out infinite';

                const arrowLeftDistTop = cx - (leftPosTop - actualWidth / 2);
                arrowPosStyle.left = `${(arrowLeftDistTop / actualWidth) * 100}%`;
                arrows = "bottom-[-8px] -translate-x-1/2 border-b border-r rotate-45";
                break;
            case 'right':
                style.left = cx + rw + Gap;
                style.top = Math.max(TH / 2 + Padding, Math.min(viewport.h - TH / 2 - Padding, cy));
                style.transform = 'translateY(-50%)';
                style.animation = 'float-horizontal 3s ease-in-out infinite';
                arrows = "left-[-8px] top-1/2 -translate-y-1/2 border-b border-l rotate-45";
                break;
            case 'left':
                style.right = (viewport.w - (cx - rw)) + Gap;
                style.top = Math.max(TH / 2 + Padding, Math.min(viewport.h - TH / 2 - Padding, cy));
                style.transform = 'translateY(-50%)';
                style.animation = 'float-horizontal-rev 3s ease-in-out infinite';
                arrows = "right-[-8px] top-1/2 -translate-y-1/2 border-t border-r rotate-45";
                break;
        }

        return { tooltipStyle: style, arrowClasses: arrows, arrowStyle: arrowPosStyle };
    }, [spotlightRect, viewport]);

    if (!isVisible || !spotlightRect || activeTourStep === 0) return null;

    const isNextButtonStep = !isSurveyTour && [3, 4, 6].includes(onboardingStep);
    const cxSpot = spotlightRect.left + spotlightRect.width / 2;
    const cySpot = spotlightRect.top + spotlightRect.height / 2;
    const rwSpot = spotlightRect.width / 2 + 8;

    let holePath = '';
    const needsCircle = ((isSurveyTour && surveyOnboardingStep === 1) || (!isSurveyTour && [1, 7].includes(onboardingStep))) && !(isMobileTarget && subStep === 1);
    const r = 24;

    if (needsCircle) {
        holePath = `M ${cxSpot - rwSpot},${cySpot} a ${rwSpot},${rwSpot} 0 1,0 ${rwSpot * 2},0 a ${rwSpot},${rwSpot} 0 1,0 -${rwSpot * 2},0`;
    } else {
        const x = spotlightRect.left - 8;
        const y = spotlightRect.top - 8;
        const width = spotlightRect.width + 16;
        const height = spotlightRect.height + 16;
        holePath = `M ${x + r},${y} h ${width - 2 * r} a ${r},${r} 0 0 1 ${r},${r} v ${height - 2 * r} a ${r},${r} 0 0 1 -${r},${r} h -${width - 2 * r} a ${r},${r} 0 0 1 -${r},-${r} v -${height - 2 * r} a ${r},${r} 0 0 1 ${r},-${r} Z`;
    }

    const fullPath = `M 0,0 H ${viewport.w} V ${viewport.h} H 0 Z ${holePath}`;

    return (
        <div className={`absolute inset-0 z-10000 animate-fade-in animate-duration-500 overflow-hidden ${isTransitioning ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes float-vertical { 0%, 100% { transform: translate(-50%, 0px); } 50% { transform: translate(-50%, -10px); } }
                @keyframes float-vertical-rev { 0%, 100% { transform: translate(-50%, 0px); } 50% { transform: translate(-50%, 10px); } }
                @keyframes float-horizontal { 0%, 100% { transform: translate(0px, -50%); } 50% { transform: translate(10px, -50%); } }
                @keyframes float-horizontal-rev { 0%, 100% { transform: translate(0px, -50%); } 50% { transform: translate(-10px, -50%); } }
            `}} />

            <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100 pointer-events-none'}`}>
                <svg className="absolute inset-0 w-full h-full">
                    <path
                        d={fullPath}
                        fill="rgba(0,0,0,0.7)"
                        fillRule="evenodd"
                        className="backdrop-blur-md pointer-events-auto"
                    />
                </svg>

                <div
                    className="absolute z-10010 flex flex-col pointer-events-none transition-all duration-500"
                    style={tooltipStyle}
                >
                    <div
                        className={`absolute w-4 h-4 bg-gray-950 border-white/10 z-10 ${arrowClasses}`}
                        style={arrowStyle}
                    />

                    <div className="w-full bg-gray-950 border border-white/10 rounded-4xl p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] pointer-events-auto backdrop-blur-2xl">
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${isSurveyTour ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' : 'bg-blue-500/20 text-blue-400 border-blue-500/20'}`}>
                                    {isSurveyTour ? (
                                        <>
                                            {surveyOnboardingStep === 1 && <Trophy size={18} />}
                                            {surveyOnboardingStep === 2 && <Sparkles size={18} />}
                                            {surveyOnboardingStep === 3 && <MessageSquareQuote size={18} />}
                                        </>
                                    ) : (
                                        <>
                                            {onboardingStep === 1 && <Trophy size={18} />}
                                            {onboardingStep === 2 && <Target size={18} />}
                                            {onboardingStep === 3 && <LayoutGrid size={18} />}
                                            {onboardingStep === 4 && <ListChecks size={18} />}
                                            {onboardingStep === 5 && <Map size={18} />}
                                            {onboardingStep === 6 && <Lock size={18} />}
                                            {onboardingStep === 7 && <CloseIcon size={18} />}
                                        </>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-white font-black uppercase tracking-widest text-[9px]">Paso {activeTourStep} de {isSurveyTour ? 3 : 7}</h3>
                                    <p className={`text-[8px] font-bold uppercase tracking-widest ${isSurveyTour ? 'text-amber-500' : 'text-blue-400'}`}>
                                        {isSurveyTour ? 'Feedback de Misión' : 'Tutorial de Evaluación'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-white text-base font-bold leading-tight flex items-center gap-2">
                                    {isSurveyTour ? (
                                        <>
                                            {surveyOnboardingStep === 1 && (isMobileTarget && subStep === 0 ? "Abre el Menú" : "¡Misión Cumplida!")}
                                            {surveyOnboardingStep === 2 && "Listo para evaluar"}
                                            {surveyOnboardingStep === 3 && "Tu Opinión Importa"}
                                        </>
                                    ) : (
                                        <>
                                            {onboardingStep === 1 && (isMobileTarget && subStep === 0 ? "Abre el Menú" : "Abre las Misiones")}
                                            {onboardingStep === 2 && "Selecciona un Reto"}
                                            {onboardingStep === 3 && "Resumen de Misión"}
                                            {onboardingStep === 4 && "Checklist de Tareas"}
                                            {onboardingStep === 5 && "Volver al Mapa"}
                                            {onboardingStep === 6 && "Ruta Bloqueada"}
                                            {onboardingStep === 7 && "Cerrar Panel"}
                                        </>
                                    )}
                                    <Sparkles size={14} className="text-amber-400" />
                                </p>
                                <p className="text-gray-400 text-[11px] leading-relaxed font-medium italic">
                                    {isSurveyTour ? (
                                        <>
                                            {surveyOnboardingStep === 1 && (isMobileTarget && subStep === 0 ? "Pulsa en tu avatar para abrir las opciones de cuenta." : "Has completado un reto. Pulsa el trofeo para reclamar tu insignia y darnos feedback.")}
                                            {surveyOnboardingStep === 2 && "Esta misión brilla con un nuevo color. Pulsa en ella para completar la evaluación."}
                                            {surveyOnboardingStep === 3 && "¡Casi has terminado! Pulsa el botón de feedback para compartir tu experiencia."}
                                        </>
                                    ) : (
                                        <>
                                            {onboardingStep === 1 && (isMobileTarget && subStep === 0 ? "En dispositivos pequeños el trofeo está guardado. Pulsa primero en tu menú de usuario." : "Haz clic en el trofeo para ver el Roadmap de evaluación.")}
                                            {onboardingStep === 2 && "Esta es tu misión actual. Pulsa en la tarjeta para abrir los detalles."}
                                            {onboardingStep === 3 && (viewport.w < 1024 ? "En la parte superior encontrarás el objetivo principal y tu progreso actual." : "En la parte izquierda encontrarás el objetivo principal y tu progreso actual.")}
                                            {onboardingStep === 4 && (viewport.w < 1024 ? "En la parte inferior tienes los pasos específicos. flAIghts los detectará automáticamente." : "A la derecha tienes los pasos específicos. flAIghts los detectará automáticamente.")}
                                            {onboardingStep === 5 && "Pulsa aquí para volver a la vista general de todas las misiones."}
                                            {onboardingStep === 6 && "Algunas misiones están bloqueadas. Deberás completar sus dependencias primero."}
                                            {onboardingStep === 7 && "Finalmente, usa la X para cerrar el Roadmap y empezar a navegar libremente."}
                                        </>
                                    )}
                                </p>
                            </div>

                            {isNextButtonStep && (
                                <div className="pt-1">
                                    <button
                                        onClick={nextOnboardingStep}
                                        className="w-full group flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase tracking-[0.2em] py-3 rounded-xl transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-900/40"
                                    >
                                        Siguiente Paso <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            )}

                            {!isNextButtonStep && (
                                <div className="mt-0.5 flex flex-col items-center gap-3">
                                    <div className="flex items-center justify-center gap-2 text-[8px] font-black uppercase tracking-widest text-white/20 animate-pulse">
                                        <Target size={10} /> Requiere acción directa
                                    </div>
                                    <button
                                        onClick={skipOnboarding}
                                        className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                                    >
                                        Saltar Tutorial
                                    </button>
                                </div>
                            )}

                            {isNextButtonStep && (
                                <div className="mt-2 flex justify-center">
                                    <button
                                        onClick={skipOnboarding}
                                        className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                                    >
                                        Saltar Tutorial
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MissionOnboarding;
