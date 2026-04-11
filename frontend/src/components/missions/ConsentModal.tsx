import React from 'react';
import { useMissions } from '@/context/MissionContext';
import { Shield, Check, Info, Rocket, Sparkles } from 'lucide-react';

interface ConsentModalProps {
    onAccept: () => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ onAccept }) => {
    const { missions, declineConsent } = useMissions();
    const [isChecked, setIsChecked] = React.useState(false);
    const [isClosing, setIsClosing] = React.useState(false);

    const handleAccept = () => {
        setIsClosing(true);
        setTimeout(onAccept, 300);
    };

    const handleDecline = () => {
        setIsClosing(true);
        setTimeout(() => {
            declineConsent();
        }, 300);
    };

    return (
        <div className={`fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-duration-500 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
            <div className={`relative w-full max-w-lg rounded-3xl border border-white/20 bg-linear-to-b from-gray-900 to-black shadow-2xl animate-duration-300 overflow-hidden ${isClosing ? 'animate-zoom-out' : 'animate-zoom-in'}`}>
                {/* Decorative background glows - Fixed in frame */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
                </div>

                {/* Scrollable area only for content */}
                <div className="relative max-h-[calc(100svh-2rem)] overflow-y-auto custom-scrollbar p-8">
                    <div className="relative">
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
                            <Sparkles size={32} />
                        </div>

                        <h2 className="mb-4 text-3xl font-bold text-white tracking-tight">
                            Evaluación de <span className="text-blue-400">flAIghts</span>
                        </h2>

                        <div className="mb-6 space-y-4 text-gray-300 leading-relaxed">
                            <p className="flex items-start gap-3 text-sm">
                                <Info size={20} className="mt-1 shrink-0 text-blue-400" />
                                <span>Este sistema de evaluación interactivo forma parte de un estudio de <strong>usabilidad para nuestro Trabajo de Fin de Grado (TFG)</strong>.</span>
                            </p>

                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                                    <Rocket size={16} /> Misiones a realizar
                                </h3>
                                <ul className="space-y-2">
                                    {missions.map(m => (
                                        <li key={m.id} className="flex items-center gap-2 text-sm text-gray-400">
                                            <div className="h-1 w-1 rounded-full bg-blue-500" />
                                            {m.title}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <p className="flex items-start gap-3 text-xs italic">
                                <Shield size={20} className="mt-1 shrink-0 text-amber-400" />
                                <span>Para vincular los resultados con tu actividad, recogeremos datos asociados a tu sesión. Solo utilizaremos esta información para fines académicos y análisis de usabilidad.</span>
                            </p>

                            <div className="flex items-center gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 animate-pulse-slow">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                                    <Sparkles size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-amber-400">Tutorial Recomendado</p>
                                    <p className="text-[10px] text-gray-400 leading-tight">Al aceptar, comenzará una <strong>guía interactiva</strong>. Te recomendamos seguirla para no perderte ningún detalle del sistema de misiones.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-6 items-center">
                                    <input
                                        id="consent-check"
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => setIsChecked(e.target.checked)}
                                        className="h-5 w-5 rounded-sm border-white/20 bg-white/10 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer"
                                    />
                                </div>
                                <label htmlFor="consent-check" className="text-xs text-white/90 leading-tight cursor-pointer select-none">
                                    <span className="font-bold text-blue-400">Consentimiento obligatorio:</span> Consiento el procesamiento de mis datos de interacción vinculados a mi usuario para el Trabajo de Fin de Grado.
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <button
                                onClick={handleAccept}
                                disabled={!isChecked}
                                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-blue-600 px-6 py-4 font-bold text-white transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none hover:cursor-pointer"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    Acepto participar <Check size={20} />
                                </span>
                                <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                            </button>

                            <button
                                onClick={handleDecline}
                                className="text-center text-[11px] text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest font-bold"
                            >
                                Prefiero no participar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConsentModal;
