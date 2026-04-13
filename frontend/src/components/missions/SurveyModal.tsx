import React, { useState, useEffect, useRef } from 'react';
import { useMissions } from '@/context/MissionContext';
import { MessageSquare, Star, Send, X, Check, Sparkles } from 'lucide-react';

const SurveyModal: React.FC = () => {
    const { showSurveyMissionId, setShowSurveyMissionId, missions, addSurveyAnswer } = useMissions();
    const [rating, setRating] = useState<number>(0);
    const [comment, setComment] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [hoveredRating, setHoveredRating] = useState<number>(0);
    const backdropMouseDown = useRef(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setShowSurveyMissionId(null);
            setIsClosing(false);
        }, 300);
    };

    if (!showSurveyMissionId) return null;

    const mission = missions.find(m => m.id === showSurveyMissionId);
    if (!mission) return null;

    const handleSubmit = () => {
        if (rating === 0) return;
        setIsClosing(true);
        addSurveyAnswer(showSurveyMissionId, {
            rating,
            comment
        });
        setTimeout(() => {
            setShowSurveyMissionId(null);
            setRating(0);
            setComment('');
            setIsClosing(false);
        }, 300);
    };

    return (
        <div
            className={`fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-duration-500 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
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
            <div className={`relative w-full max-w-lg max-h-[calc(100svh-2rem)] overflow-y-auto custom-scrollbar rounded-[2.5rem] border border-white/10 bg-gray-950 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] animate-duration-300 flex flex-col ${isClosing ? 'animate-zoom-out' : 'animate-zoom-in'}`}>

                {/* Decorative Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-blue-500/10 blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-[60px] pointer-events-none" />

                <button
                    onClick={handleClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer z-20"
                >
                    <X size={20} />
                </button>

                <div className="p-8 sm:p-10 relative z-10">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/20 border-b-blue-500/40 shadow-lg shadow-blue-500/10">
                        <MessageSquare size={28} className="drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-black text-white tracking-tight">Feedback de Misión</h2>
                    </div>
                    <p className="text-gray-400 text-sm mb-8 font-medium">Ayúdanos a mejorar flAIghts valorando tu experiencia.</p>

                    {/* Mission Context Mini-Card */}
                    <div className="mb-8 p-5 rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group">
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-xl shrink-0 group-hover:scale-110 transition-transform duration-300">
                                {mission.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-white font-bold text-sm truncate">{mission.title}</h4>
                                    <div className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-green-500/10 flex items-center gap-1 shrink-0">
                                        <Sparkles size={8} /> Conseguida
                                    </div>
                                </div>
                                <p className="text-gray-400 text-xs leading-relaxed mb-3">{mission.description}</p>

                                <div className="pt-3 border-t border-white/5 space-y-1.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Pasos validados:</p>
                                    {mission.steps.map(step => (
                                        <div key={step.id} className="flex items-center gap-2 text-[10px] text-gray-400 font-medium italic">
                                            <div className="flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400">
                                                <Check size={10} strokeWidth={3} />
                                            </div>
                                            {step.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Rating Selection */}
                        <div className="text-center sm:text-left">
                            <p className="mb-4 text-sm text-gray-200 font-semibold tracking-wide">¿Cómo de fácil e intuitivo te ha resultado completar el reto?</p>
                            <div className="flex flex-col items-center gap-6">
                                <div
                                    className="flex justify-center gap-2 p-2"
                                    onMouseLeave={() => setHoveredRating(0)}
                                >
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onMouseEnter={() => setHoveredRating(star)}
                                            onClick={() => setRating(star)}
                                            className={`p-1 transition-all duration-300 transform active:scale-90 cursor-pointer ${(hoveredRating || rating) >= star
                                                ? 'text-amber-400 scale-110 drop-shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                                                : 'text-gray-700 hover:text-gray-500'
                                                }`}
                                        >
                                            <Star
                                                size={40}
                                                strokeWidth={1.5}
                                                fill={(hoveredRating || rating) >= star ? 'currentColor' : 'none'}
                                                className="transition-all duration-300"
                                            />
                                        </button>
                                    ))}
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest h-5 text-amber-500/80 italic text-center">
                                    {rating === 1 && "Muy difícil"}
                                    {rating === 2 && "Difícil"}
                                    {rating === 3 && "Neutral"}
                                    {rating === 4 && "Fácil"}
                                    {rating === 5 && "Muy fácil"}
                                </div>
                            </div>
                        </div>

                        {/* Comments */}
                        <div className="relative">
                            <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">Tus Sugerencias (Opcional)</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Comparte cualquier duda, molestia o idea que hayas tenido..."
                                className="h-32 w-full rounded-2xl border border-white/10 bg-white/3 p-5 text-sm text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:bg-white/5 focus:outline-hidden transition-all duration-300 resize-none shadow-inner"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={rating === 0}
                            className={`group relative overflow-hidden flex w-full items-center justify-center gap-3 rounded-2xl py-4 font-black uppercase tracking-[0.2em] text-xs transition-all duration-500 active:scale-[0.98] ${rating > 0
                                ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 cursor-pointer'
                                : 'bg-white/5 text-white/20 border border-white/5 opacity-50 cursor-not-allowed'
                                }`}
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            {isClosing ? 'Enviando...' : 'Finalizar Evaluación'}
                            {!isClosing && <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                        </button>
                    </div>
                </div>

                {/* Visual Accent Bar */}
                <div className={`h-1.5 w-full bg-linear-to-r from-blue-500 to-indigo-500 transition-transform duration-700 origin-left ${rating === 0 ? 'scale-x-0' : 'scale-x-100'}`} />
            </div>
        </div>
    );
};

export default SurveyModal;
