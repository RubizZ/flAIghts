import React, { useState } from 'react';
import { useMissions } from '@/context/MissionContext';
import { CheckCircle2, Circle, X, Trophy, Map, LayoutGrid, ChevronLeft, ChevronRight, MessageSquareQuote, Sparkles } from 'lucide-react';
import { Mission } from '@/types/missions';
import { useTranslation } from 'react-i18next';

interface MissionDashboardProps {
    mission: Mission;
    onClose: () => void;
    onBackToRoadmap: () => void;
    onNext: () => void;
    onPrev: () => void;
    onOpenSurvey: (missionId: string) => void;
    showControls: boolean;
    currentIndex: number;
    totalAvailable: number;
}

const MissionDashboard: React.FC<MissionDashboardProps> = ({
    mission,
    onClose,
    onBackToRoadmap,
    onNext,
    onPrev,
    onOpenSurvey,
    showControls,
    currentIndex,
    totalAvailable
}) => {
    const { t } = useTranslation();
    const { allCompleted, isMissionRated } = useMissions();
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const handleBackToRoadmapWithAnim = () => {
        setIsClosing(true);
        setTimeout(onBackToRoadmap, 300);
    };

    const completedSteps = mission.steps.filter(s => s.isCompleted).length;
    const progress = (completedSteps / mission.steps.length) * 100;
    const isRated = isMissionRated(mission.id);

    return (
        <div
            className={`fixed inset-0 z-100 flex items-center justify-center backdrop-blur-md animate-duration-300 p-4 md:p-8 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className={`relative w-full max-w-7xl h-full sm:h-[85vh] sm:max-h-[85vh] overflow-hidden rounded-3xl border border-white/10 bg-gray-950 shadow-2xl animate-duration-300 flex flex-col ${isClosing ? 'animate-zoom-out' : 'animate-zoom-in'}`}
            >
                {/* Header Section (Responsive) */}
                <div className="shrink-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-6 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl">
                    {/* Mission Switcher */}
                    <div className="order-2 sm:order-1 flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center">
                        {!allCompleted && showControls && currentIndex !== -1 && (
                            <>
                                <button
                                    onClick={onPrev}
                                    className="p-3 sm:p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                >
                                    <ChevronLeft size={20} className="sm:size-4" />
                                </button>

                                <div className="px-4 sm:px-5 py-2.5 sm:py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-md flex-1 sm:flex-initial">
                                    <div className="flex items-center gap-2 sm:gap-3 justify-center">
                                        <span className="text-sm sm:text-xs">{mission.icon}</span>
                                        <span className="text-[10px] sm:text-[9px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white truncate max-w-30 sm:max-w-none">
                                            {t(mission.title)}
                                        </span>
                                        <span className="text-[8px] sm:text-[9px] font-bold text-white/20 ml-1 sm:ml-2">
                                            {currentIndex + 1}/{totalAvailable}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={onNext}
                                    className="p-3 sm:p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                >
                                    <ChevronRight size={20} className="sm:size-4" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Exit Actions */}
                    <div className="order-1 sm:order-2 flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            id="dashboard-back-button"
                            onClick={handleBackToRoadmapWithAnim}
                            className="flex-1 sm:flex-initial px-5 py-3 sm:px-4 sm:py-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-blue-500/20 hover:border-blue-500/30 transition-all flex items-center justify-center gap-2 group border border-white/10 shadow-lg backdrop-blur-md cursor-pointer"
                        >
                            <Map size={18} className="group-hover:scale-110 transition-transform sm:size-4" />
                            <span className="text-[10px] sm:text-[9px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em]">{t('missions.dashboard.backToRoadmap')}</span>
                        </button>

                        <button
                            onClick={handleClose}
                            className="p-3 sm:p-2 rounded-xl bg-white/5 text-white/40 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all border border-white/10 shadow-lg backdrop-blur-md cursor-pointer"
                        >
                            <X size={22} className="sm:size-4.5" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-auto custom-scrollbar p-6 sm:p-8 md:p-12">
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
                        {/* Left Side: Summary */}
                        <div id="dashboard-left-summary" className="w-full lg:w-2/5 flex flex-col items-center lg:items-start text-center lg:text-left">
                            <div className="mb-4 sm:mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-xl shadow-blue-500/10">
                                {mission.isCompleted ? <Trophy size={32} className="sm:size-10 text-green-400" /> : <span className="text-2xl sm:text-4xl">{mission.icon}</span>}
                            </div>

                            <div className="flex flex-col items-center lg:items-start">
                                {mission.isCompleted && (
                                    <div className="mb-2 sm:mb-3 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                        <Trophy size={10} />
                                        {t('missions.dashboard.missionPassed')}
                                    </div>
                                )}
                                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 sm:mb-3 tracking-tight leading-tight">
                                    {t(mission.title)}
                                </h3>
                            </div>

                            <p className="font-black uppercase tracking-[0.4em] text-[8px] sm:text-[9px] mb-4 sm:mb-6 text-blue-500">
                                {t('missions.dashboard.mainObjective')}
                            </p>

                            <div className="space-y-3 sm:space-y-4 mb-6">
                                <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-md">
                                    {t(mission.description)}
                                </p>
                                {mission.isCompleted && (
                                    <p className="text-[11px] sm:text-xs text-white/40 italic leading-relaxed max-w-md border-l-2 border-green-500/30 pl-4 py-1 mt-4">
                                        {t('missions.dashboard.successMessage')}
                                    </p>
                                )}
                            </div>

                            {!isRated && mission.isCompleted && (
                                <button
                                    id="dashboard-survey-button"
                                    onClick={() => onOpenSurvey(mission.id)}
                                    className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-[9px] sm:text-[10px] transition-all shadow-xl shadow-amber-900/20 group hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    <Sparkles size={16} className="sm:size-5 group-hover:rotate-12 transition-transform" />
                                    <span>{t('missions.dashboard.giveFeedback')}</span>
                                </button>
                            )}

                            {isRated && mission.isCompleted && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] sm:text-[11px] font-bold">
                                    <CheckCircle2 size={14} />
                                    <span>{t('missions.dashboard.feedbackSaved')}</span>
                                </div>
                            )}

                            {!mission.isCompleted && (
                                <div className="w-full max-w-sm flex flex-col gap-2 sm:gap-3 mt-3 sm:mt-4">
                                    <div className="flex justify-between text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] text-white/30">
                                        <span>{t('missions.dashboard.progress')}</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-white/5 border border-white/5 p-0.5">
                                        <div
                                            className="h-full bg-linear-to-r from-blue-700 via-blue-500 to-indigo-400 shadow-[0_0_20px_rgba(37,99,235,0.3)] rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Checklist */}
                        <div id="dashboard-right-checklist" className="w-full lg:w-3/5 space-y-3 sm:space-y-4">
                            <h4 className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] text-white/10 mb-4 sm:mb-6">{t('missions.dashboard.taskStatus')}</h4>
                            <div className="flex flex-col gap-2 sm:gap-3">
                                {mission.steps.map((step) => (
                                    <div key={step.id} className={`group flex items-start sm:items-center gap-3 sm:gap-6 p-4 sm:p-5 rounded-xl sm:rounded-2xl border transition-all duration-300 ${step.isCompleted
                                        ? 'bg-green-500/5 border-green-500/10 opacity-40'
                                        : 'bg-white/5 border-white/5 hover:border-blue-500/30'
                                        }`}>
                                        <div className="relative group/tooltip shrink-0">
                                            <div className={`h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-xl transition-all ${step.isCompleted ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-white/5 text-white/10 group-hover:bg-blue-500/20 group-hover:text-blue-400'}`}>
                                                {step.isCompleted ? <CheckCircle2 size={16} className="sm:size-5" /> : <Circle size={14} className="sm:size-5" />}
                                            </div>

                                            {/* Tooltip Detallado */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 bg-gray-900 text-white text-[10px] rounded-xl opacity-0 group-hover/tooltip:opacity-100 transition-all scale-90 group-hover/tooltip:scale-100 whitespace-nowrap pointer-events-none z-50 shadow-2xl border border-white/10 flex flex-col items-center gap-0.5">
                                                <span className="font-black uppercase tracking-widest text-blue-400 text-[8px]">{t('missions.dashboard.autoDetection')}</span>
                                                <span className="font-medium opacity-80">{t('missions.dashboard.autoDetectionDesc')}</span>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm sm:text-base lg:text-lg font-bold mb-0.5 sm:mb-1 transition-all truncate ${step.isCompleted ? 'text-white/30 line-through' : 'text-white'}`}>
                                                {t(step.title)}
                                            </p>
                                            <p className={`text-[10px] sm:text-xs lg:text-sm leading-relaxed font-medium transition-all ${step.isCompleted ? 'text-white/20' : 'text-white/40'}`}>
                                                {t(step.description)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="shrink-0 p-4 sm:p-6 border-t border-white/5 bg-gray-950 flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left">
                    <div className="flex items-center gap-3 text-white/20">
                        <LayoutGrid size={14} className="sm:size-4" />
                        <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">flAIghts</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/40 text-[7px] sm:text-[9px] font-bold italic">
                        {t('missions.dashboard.footerHero')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MissionDashboard;
