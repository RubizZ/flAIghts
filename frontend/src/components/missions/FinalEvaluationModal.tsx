import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMissions } from '@/context/MissionContext';
import { Trophy, CheckCircle, Send, Heart, User, ClipboardList, GraduationCap, ChevronDown, Bookmark, Smartphone, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const SUS_QUESTIONS = [
    "Creo que me gustará usar este sistema con frecuencia.",
    "Encontré el sistema innecesariamente complejo.",
    "Pensé que el sistema era fácil de usar.",
    "Creo que necesitaría el apoyo de una persona técnica para ser capaz de usar este sistema.",
    "Encontré que las diversas funciones de este sistema estaban bastante bien integradas.",
    "Pensé que había demasiada inconsistencia en este sistema.",
    "Imagino que la mayoría de las personas aprenderían a usar este sistema muy rápidamente.",
    "Encontré el sistema muy engorroso de usar.",
    "Me sentí muy seguro usando el sistema.",
    "Necesité aprender muchas cosas antes de poder ponerme en marcha con este sistema."
];

const FinalEvaluationModal: React.FC = () => {
    const { t } = useTranslation();
    const { allCompleted, surveyAnswers, missions, finishEvaluation, evaluationFinished } = useMissions();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fullName, setFullName] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [susAnswers, setSusAnswers] = useState<(number | null)[]>(Array(10).fill(null));
    const [age, setAge] = useState<string>('');
    const [gender, setGender] = useState<string>('');
    const [educationLevel, setEducationLevel] = useState<string>('');
    const [showThanks, setShowThanks] = useState(false);
    const { user, isAuthenticated } = useAuth();

    // Solo se muestra si todas las misiones están completas y se han respondido todos los tests
    const allSurveysDone = missions.every(m => !m.isCompleted || surveyAnswers.some(a => a.missionId === m.id));

    if (!allCompleted || !allSurveysDone) return null;
    if (evaluationFinished && !showThanks) return null;

    const allSusAnswered = susAnswers.every(a => a !== null);
    const allDemoAnswered = age && gender && educationLevel;

    const handleSubmit = async () => {
        if (!allSusAnswered) return;
        const nameToSubmit = isAnonymous ? 'Anónimo' : fullName.trim();
        if (!isAnonymous && !nameToSubmit) return;

        setIsSubmitting(true);
        await finishEvaluation(nameToSubmit, susAnswers as number[], {
            age: parseInt(age),
            gender,
            educationLevel
        });
        setIsSubmitting(false);
        setShowThanks(true);
    };

    const handleClose = async () => {
        setIsClosing(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        setShowThanks(false);
    };

    return (
        <div className={`fixed inset-0 z-200 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-black/80 backdrop-blur-md animate-duration-700 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
            <div className={`relative w-full max-w-4xl max-h-full flex flex-col overflow-hidden rounded-3xl border border-white/20 bg-linear-to-b from-blue-900/40 to-black text-center shadow-2xl animate-duration-500 ${isClosing ? 'animate-zoom-out' : 'animate-zoom-in'}`}>
                {/* Background decorative elements */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
                    <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
                </div>

                <div className="relative z-10 overflow-y-auto custom-scrollbar flex-1 w-full p-8 lg:p-12">
                    {showThanks ? (
                        <div className="animate-fade-in animate-duration-500 flex flex-col items-center">
                            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20 text-green-400 shadow-2xl shadow-green-500/20 ring-4 ring-green-500/30">
                                <Heart size={48} className="fill-current animate-pulse" />
                            </div>

                            <h2 className="mb-4 text-4xl md:text-5xl font-black text-white tracking-tight uppercase italic animate-fade-in">¡MUCHAS GRACIAS!</h2>

                            <p className="mb-6 text-xl text-blue-200/80 font-medium max-w-2xl animate-fade-in" style={{ animationDelay: '100ms' }}>
                                Tu participación ha sido clave para el éxito de nuestro Trabajo de Fin de Grado. Valoramos enormemente tu tiempo y esfuerzo.
                            </p>

                            <p className="mb-10 text-gray-400 text-lg leading-relaxed max-w-2xl animate-fade-in" style={{ animationDelay: '150ms' }}>
                                Ahora que has explorado todas las capacidades de <strong>flAIghts</strong>, te animamos a que sigas usándolo en tu día a día.
                                Deja que nuestra IA encuentre las mejores ofertas por ti y convierte cada búsqueda en una aventura.
                            </p>

                            {/* Badge Reward Section */}
                            <div className="mb-10 flex flex-col items-center gap-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-blue-500/30 blur-2xl rounded-full group-hover:bg-blue-500/50 transition-all duration-700" />
                                    <div className="relative h-24 w-24 flex items-center justify-center bg-gray-900 border-2 border-blue-500/30 rounded-3xl shadow-2xl rotate-3 group-hover:rotate-0 transition-all duration-500 overflow-hidden">
                                        <div className="absolute inset-0 bg-linear-to-tr from-blue-500/10 to-transparent" />
                                        <Trophy size={48} className="text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                        <div className="absolute top-0 right-0 p-1">
                                            <Star size={10} className="text-blue-300 fill-blue-300 animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="absolute -top-3 -right-3 bg-blue-500 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-2xl border border-white/20">Desbloqueado</div>
                                </div>
                                <div className="flex flex-col items-center gap-1.5">
                                    <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm">Insignia de Evaluador</h3>
                                    <p className="text-blue-200/50 text-[11px] font-bold">Has recibido una insignia exclusiva por completar el estudio.</p>
                                </div>
                            </div>

                            {/* Action Grid */}
                            <div className="flex flex-wrap justify-center gap-3 mb-12 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                                {isAuthenticated && (
                                    <button
                                        onClick={() => { handleClose(); navigate('/user/' + user?.username); }}
                                        className="flex items-center gap-3 px-6 py-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-2xl transition-all group cursor-pointer"
                                    >
                                        <User size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                        <div className="flex flex-col items-start gap-0.5">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Ver en mi perfil</span>
                                            <span className="text-[8px] font-bold text-blue-300/50 uppercase">Tus logros y medallas</span>
                                        </div>
                                    </button>
                                )}

                                <button
                                    onClick={() => window.alert('Para añadir flAIghts a tus marcadores, pulsa Ctrl+D (Windows) o Cmd+D (Mac)')}
                                    className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group cursor-pointer"
                                >
                                    <Bookmark size={18} className="text-white/40 group-hover:text-blue-400 group-hover:fill-blue-400/20 transition-all" />
                                    <div className="flex flex-col items-start gap-0.5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Guardar Marcador</span>
                                        <span className="text-[8px] font-bold text-white/20 uppercase">Acceso rápido</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => window.alert('Para añadir flAIghts a tu pantalla de inicio, usa la opción "Añadir a pantalla de inicio" en el menú de tu navegador.')}
                                    className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group cursor-pointer"
                                >
                                    <Smartphone size={18} className="text-white/40 group-hover:text-blue-400 transition-colors" />
                                    <div className="flex flex-col items-start gap-0.5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Instalar App</span>
                                        <span className="text-[8px] font-bold text-white/20 uppercase">Pantalla de inicio</span>
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={handleClose}
                                className="group relative px-16 py-5 bg-white text-blue-900 rounded-3xl font-black text-xl uppercase tracking-[0.2em] hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.2)] cursor-pointer overflow-hidden animate-fade-in-up"
                                style={{ animationDelay: '400ms' }}
                            >
                                <div className="absolute inset-0 bg-linear-to-r from-transparent via-blue-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                <span>Volver al inicio</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-500/20 text-blue-400 mx-auto shadow-xl ring-2 ring-blue-500/30">
                                <Trophy size={40} className="animate-bounce" />
                            </div>

                            <h2 className="mb-2 text-3xl md:text-4xl font-black text-white tracking-tight uppercase italic">¡ENHORABUENA!</h2>
                            <h3 className="mb-6 text-lg md:text-xl font-bold text-blue-300">Has completado las misiones del programa de evaluación</h3>

                            <div className="mb-8 space-y-6 text-gray-300">
                                <div className="flex items-start gap-3 justify-center text-sm text-center">
                                    <span>Has completado satisfactoriamente todas las misiones de usabilidad para nuestro <strong>Trabajo de Fin de Grado</strong>.<br /> Por favor, completa este cuestionario final para terminar.</span>
                                </div>

                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left">
                                    <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><ClipboardList size={20} className="text-blue-400" /> Cuestionario de Usabilidad (10 preguntas)</h4>
                                    <p className="text-sm text-gray-400 mb-6">Valora las siguientes afirmaciones de 1 (Totalmente en desacuerdo) a 5 (Totalmente de acuerdo).</p>

                                    <div className="space-y-4">
                                        {SUS_QUESTIONS.map((q, idx) => (
                                            <div key={idx} className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors">
                                                <p className="text-sm md:text-base text-white mb-4 font-medium">{idx + 1}. {q}</p>
                                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto">
                                                    <span className="hidden sm:block text-xs text-gray-500 w-24 text-right font-medium uppercase tracking-wider leading-tight">Totalmente en<br />desacuerdo</span>
                                                    <div className="flex justify-center gap-2 md:gap-4 flex-1">
                                                        {[1, 2, 3, 4, 5].map(val => (
                                                            <button
                                                                key={val}
                                                                onClick={() => {
                                                                    const newAnswers = [...susAnswers];
                                                                    newAnswers[idx] = val;
                                                                    setSusAnswers(newAnswers);
                                                                }}
                                                                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black transition-all cursor-pointer ${susAnswers[idx] === val
                                                                    ? 'bg-blue-500 text-white scale-110 shadow-lg shadow-blue-500/30 ring-2 ring-white/20'
                                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                                                                    }`}
                                                            >
                                                                {val}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <span className="hidden sm:block text-xs text-gray-500 w-24 text-left font-medium uppercase tracking-wider leading-tight">Totalmente<br />de acuerdo</span>

                                                    {/* Mobile labels */}
                                                    <div className="flex sm:hidden justify-between w-full px-2 text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                                                        <span>Desacuerdo</span>
                                                        <span>Acuerdo</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left">
                                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><User size={20} className="text-blue-400" /> Datos Demográficos</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Edad</label>
                                            <input
                                                type="number"
                                                value={age}
                                                onChange={(e) => setAge(e.target.value)}
                                                placeholder="Ej: 25"
                                                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder:text-gray-600 focus:border-blue-500 focus:bg-white/10 focus:outline-hidden transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Sexo</label>
                                            <div className="relative group/select">
                                                <select
                                                    value={gender}
                                                    onChange={(e) => setGender(e.target.value)}
                                                    className={`w-full rounded-xl border border-white/10 bg-white/5 p-3 pr-10 focus:border-blue-500 focus:bg-white/10 focus:outline-hidden transition-all appearance-none cursor-pointer ${gender ? 'text-white' : 'text-gray-600'}`}
                                                >
                                                    <option value="" disabled className="bg-gray-900 text-gray-600">Seleccionar...</option>
                                                    <option value="Masculino" className="bg-gray-900 text-white">Masculino</option>
                                                    <option value="Femenino" className="bg-gray-900 text-white">Femenino</option>
                                                    <option value="Otro" className="bg-gray-900 text-white">Otro</option>
                                                    <option value="Prefiero no decirlo" className="bg-gray-900 text-white">Prefiero no decirlo</option>
                                                </select>
                                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none transition-colors group-focus-within/select:text-blue-400" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                                <GraduationCap size={14} /> Nivel de Estudios
                                            </label>
                                            <div className="relative group/select">
                                                <select
                                                    value={educationLevel}
                                                    onChange={(e) => setEducationLevel(e.target.value)}
                                                    className={`w-full rounded-xl border border-white/10 bg-white/5 p-3 pr-10 focus:border-blue-500 focus:bg-white/10 focus:outline-hidden transition-all appearance-none cursor-pointer ${educationLevel ? 'text-white' : 'text-gray-600'}`}
                                                >
                                                    <option value="" disabled className="bg-gray-900 text-gray-600">Seleccionar...</option>
                                                    <option value="Sin estudios" className="bg-gray-900 text-white">Sin estudios</option>
                                                    <option value="Primaria" className="bg-gray-900 text-white">Primaria</option>
                                                    <option value="Secundaria / ESO" className="bg-gray-900 text-white">Secundaria / ESO</option>
                                                    <option value="Bachillerato / FP" className="bg-gray-900 text-white">Bachillerato / FP</option>
                                                    <option value="Grado Universitario" className="bg-gray-900 text-white">Grado Universitario</option>
                                                    <option value="Máster / Doctorado" className="bg-gray-900 text-white">Máster / Doctorado</option>
                                                </select>
                                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none transition-colors group-focus-within/select:text-blue-400" />
                                            </div>
                                        </div>
                                    </div>
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
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !allSusAnswered || !allDemoAnswered || (!isAnonymous && !fullName.trim())}
                                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 px-8 py-5 font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100 shadow-2xl shadow-blue-600/30 cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">Enviando resultados...</span>
                                ) : (
                                    <>
                                        <span className="relative z-10 text-lg uppercase tracking-wider">
                                            {(!allSusAnswered || !allDemoAnswered) ? 'Completa el cuestionario' : 'Finalizar y Enviar'}
                                        </span>
                                        {allSusAnswered && allDemoAnswered && <Send size={24} className="relative z-10 transition-transform group-hover:translate-x-1" />}
                                    </>
                                )}
                                <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                            </button>

                            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
                                <span>Hecho con</span>
                                <Heart size={16} className="text-red-500 fill-current" />
                                <span>por Rubén, Nicolás y Leonardo</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinalEvaluationModal;
