import React, { useState } from 'react';
import { useMissions } from '@/context/MissionContext';
import { Trophy, CheckCircle, Send, Heart, User } from 'lucide-react';

const FinalEvaluationModal: React.FC = () => {
    const { allCompleted, surveyAnswers, missions, finishEvaluation, evaluationFinished } = useMissions();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fullName, setFullName] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Solo se muestra si todas las misiones están completas y se han respondido todos los tests
    const allSurveysDone = missions.every(m => !m.isCompleted || surveyAnswers.some(a => a.missionId === m.id));

    if (!allCompleted || !allSurveysDone || evaluationFinished) return null;

    const handleSubmit = async () => {
        const nameToSubmit = isAnonymous ? 'Anónimo' : fullName.trim();
        if (!isAnonymous && !nameToSubmit) return;
        
        setIsSubmitting(true);
        setIsClosing(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        await finishEvaluation(nameToSubmit);
        setIsSubmitting(false);
    };

    return (
        <div className={`fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-duration-700 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
            <div className={`relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-linear-to-b from-blue-900/40 to-black p-10 text-center shadow-2xl animate-duration-500 ${isClosing ? 'animate-zoom-out' : 'animate-zoom-in'}`}>
                {/* Background decorative elements */}
                <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />

                <div className="relative z-10">
                    <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-500/20 text-blue-400 mx-auto shadow-xl ring-2 ring-blue-500/30">
                        <Trophy size={48} className="animate-bounce" />
                    </div>

                    <h2 className="mb-2 text-4xl font-black text-white tracking-tight uppercase italic">¡ENHORABUENA!</h2>
                    <h3 className="mb-6 text-xl font-bold text-blue-300">Has completado el programa de evaluación</h3>

                    <div className="mb-8 space-y-4 text-gray-300">
                        <div className="flex items-start gap-3 justify-center text-sm text-center">
                            <span>Has terminado satisfactoriamente todas las misiones de usabilidad para nuestro <strong>Trabajo de Fin de Grado</strong>.</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 overflow-hidden">
                            <label className={`mb-3 text-left text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${isAnonymous ? 'text-white/20' : 'text-blue-400'}`}>
                                <User size={14} /> Tu nombre y apellidos
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                disabled={isAnonymous}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Escribe aquí para los agradecimientos..."
                                className={`w-full rounded-xl border p-4 text-white placeholder:text-gray-600 focus:outline-hidden transition-all ${isAnonymous ? 'bg-black/20 border-white/5 opacity-30 text-white/20 cursor-not-allowed' : 'bg-black/40 border-white/10 focus:border-blue-500'}`}
                            />
                            
                            <div className="mt-4 flex items-center justify-between gap-4">
                                <p className={`text-left text-[10px] italic transition-colors ${isAnonymous ? 'text-white/20' : 'text-gray-500'}`}>
                                    Usaremos tu nombre para incluirte en los agradecimientos de nuestro TFG.
                                </p>
                                
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={isAnonymous}
                                            onChange={(e) => setIsAnonymous(e.target.checked)}
                                            className="peer sr-only"
                                        />
                                        <div className="h-5 w-5 rounded-md border-2 border-white/10 bg-black/40 transition-all peer-checked:border-blue-500 peer-checked:bg-blue-500/20 group-hover:border-white/30" />
                                        <CheckCircle size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 opacity-0 transition-opacity peer-checked:opacity-100" />
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isAnonymous ? 'text-blue-400' : 'text-white/40 group-hover:text-white/60'}`}>Prefiero ser anónimo</span>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                                <CheckCircle size={24} />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-white">Misiones y tests listos</p>
                                <p className="text-xs text-gray-400">Todo preparado para enviar.</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (!isAnonymous && !fullName.trim())}
                        className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 px-8 py-5 font-black text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-2xl shadow-blue-600/30 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">Enviando resultados...</span>
                        ) : (
                            <>
                                <span className="relative z-10 text-lg uppercase tracking-wider">Finalizar y Enviar</span>
                                <Send size={24} className="relative z-10 transition-transform group-hover:translate-x-1" />
                            </>
                        )}
                        <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    </button>

                    <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
                        <span>Hecho con</span>
                        <Heart size={16} className="text-red-500 fill-current" />
                        <span>para el TFG de flAIghts</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinalEvaluationModal;
