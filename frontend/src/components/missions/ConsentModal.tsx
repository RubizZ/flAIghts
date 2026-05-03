import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMissions } from '@/context/MissionContext';
import { Shield, Check, Info, Rocket, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ConsentModalProps {
    onAccept: () => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ onAccept }) => {
    const { t } = useTranslation();
    const { missions, declineConsent } = useMissions();
    const [step, setStep] = React.useState(1);
    const [isChecked, setIsChecked] = React.useState(false);
    const [isClosing, setIsClosing] = React.useState(false);
    const navigate = useNavigate();
    const scrollRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [step]);

    const handleAccept = () => {
        setIsClosing(true);
        setTimeout(onAccept, 300);
        navigate('/');
    };

    const handleDecline = () => {
        setIsClosing(true);
        setTimeout(() => {
            declineConsent();
        }, 300);
    };

    const nextStep = () => setStep(2);
    const prevStep = () => setStep(1);

    return (
        <div className={`fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-duration-500 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
            <div className={`relative w-full max-w-lg rounded-3xl border border-white/20 bg-linear-to-b from-gray-900 to-black shadow-2xl animate-duration-300 overflow-hidden ${isClosing ? 'animate-zoom-out' : 'animate-zoom-in'}`}>
                {/* Decorative background glows - Fixed in frame */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
                </div>

                {/* Scrollable area only for content */}
                <div ref={scrollRef} className="relative max-h-[calc(100svh-2rem)] overflow-y-auto custom-scrollbar p-8">
                    <div className="relative">
                        {step === 1 ? (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
                                    <Shield size={32} />
                                </div>

                                <h2 className="mb-4 text-3xl font-bold text-white tracking-tight">
                                    {t('missions.consent.title_prefix')} <span className="text-blue-400">flAIghts</span>
                                </h2>

                                <p className="mb-6 text-lg font-medium text-white/90">
                                    {t('missions.consent.welcome').split('flAIghts')[0]}<span className="text-blue-400">flAIghts</span>{t('missions.consent.welcome').split('flAIghts')[1]}
                                </p>

                                <p className="mb-6 text-lg font-medium text-white/90">
                                    {t('missions.consent.tfg_notice').split('Trabajo de Fin de Grado')[0]}<span className="text-blue-400">{t('common.tfg')}</span>{t('missions.consent.tfg_notice').split('Trabajo de Fin de Grado')[1]}
                                </p>

                                <p className="mb-6 text-lg font-medium text-white/90">
                                    {t('missions.consent.invitation').split('insignia')[0]}<span className="text-yellow-400">{t('common.badge')}</span>{t('missions.consent.invitation').split('insignia')[1]}
                                </p>

                                <div className="mb-6 space-y-4 text-gray-300 leading-relaxed">


                                    <p className="flex items-start gap-3 text-xs italic">
                                        <Shield size={20} className="mt-1 shrink-0 text-amber-400" />
                                        <span dangerouslySetInnerHTML={{ __html: t('missions.consent.privacy_notice').replace('datos personales', '<strong>datos personales</strong>') }} />
                                    </p>
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
                                            <span className="font-bold text-blue-400">{t('missions.consent.checkbox_label_bold')}</span> <span dangerouslySetInnerHTML={{ __html: t('missions.consent.checkbox_label').replace('datos personales', '<strong>datos personales</strong>').replace('Trabajo de Fin de Grado', '<span class="text-blue-400">' + t('common.tfg') + '</span>') }} />
                                        </label>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={nextStep}
                                        disabled={!isChecked}
                                        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-blue-600 px-6 py-4 font-bold text-white transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none hover:cursor-pointer"
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            {t('missions.consent.actions.continue')} <ArrowRight size={20} />
                                        </span>
                                        <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                                    </button>

                                    <button
                                        onClick={handleDecline}
                                        className="text-center text-[11px] text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest font-bold cursor-pointer"
                                    >
                                        {t('missions.consent.decline')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
                                    <Rocket size={32} />
                                </div>

                                <h2 className="mb-4 text-3xl font-bold text-white tracking-tight">
                                    {t('missions.consent.details_title').split('Evaluación')[0]}<span className="text-blue-400">{t('common.evaluation')}</span>{t('missions.consent.details_title').split('Evaluación')[1]}
                                </h2>

                                <p className="mb-6 text-md font-medium text-white/90">
                                    {t('missions.consent.details_description')}
                                </p>

                                <p className="mb-6 text-md font-medium text-white/90" dangerouslySetInnerHTML={{ __html: t('missions.consent.feedback_process') }} />

                                <div className="mb-6 space-y-4 text-gray-300 leading-relaxed">
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                                            <Rocket size={16} /> {t('missions.consent.missions_title')}
                                        </h3>
                                        <ul className="space-y-2">
                                            {missions.map(m => (
                                                <li key={m.id} className="flex items-center gap-2 text-sm text-gray-400">
                                                    <div className="h-1 w-1 rounded-full bg-blue-500" />
                                                    {t(m.title)}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="flex items-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 mb-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
                                            <Info size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[12px] font-black uppercase tracking-wider text-red-400">{t('missions.consent.important_notice_title')}</p>
                                            <p className="text-[11px] text-gray-400 leading-tight" dangerouslySetInnerHTML={{ __html: t('missions.consent.important_notice_description').replace('mismo dispositivo', '<strong>mismo dispositivo</strong>') }} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                                            <Sparkles size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[12px] font-black uppercase tracking-wider text-amber-400">{t('missions.consent.tutorial_title')}</p>
                                            <p className="text-[11px] text-gray-400 leading-tight" dangerouslySetInnerHTML={{ __html: t('missions.consent.tutorial_description').replace('guía interactiva', '<strong>guía interactiva</strong>') }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={handleAccept}
                                        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-blue-600 px-6 py-4 font-bold text-white transition-all hover:bg-blue-500 active:scale-95 hover:cursor-pointer"
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            {t('missions.consent.actions.start')} <Check size={20} />
                                        </span>
                                        <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                                    </button>

                                    <button
                                        onClick={prevStep}
                                        className="flex items-center justify-center gap-2 text-center text-[11px] text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest font-bold cursor-pointer"
                                    >
                                        <ArrowLeft size={14} /> {t('missions.consent.actions.back')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConsentModal;
