import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Target, Eye, ShieldCheck, Users, ArrowLeft } from "lucide-react";

export default function AboutUs() {
    const { t } = useTranslation();

    return (
        <div className="min-h-svh py-16 px-6 relative overflow-hidden">
            {/* Elementos decorativos de fondo */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand/5 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand/10 rounded-full blur-3xl -z-10" />

            <div className="max-w-4xl mx-auto">
                <div className="mb-10 animate-fade-in">
                    <Link to="/" className="group inline-flex items-center gap-2 text-brand font-semibold hover:text-brand-hover transition-all duration-300">
                        <div className="p-2 rounded-full bg-brand/10 group-hover:bg-brand/20 transition-colors">
                            <ArrowLeft size={18} />
                        </div>
                        {t("aboutUs.backToHome")}
                    </Link>
                </div>

                <header className="mb-16 animate-slide-up">
                    <div className="flex items-start gap-5">
                        <div className="p-3 bg-brand/10 rounded-2xl text-brand shrink-0">
                            <Target size={28} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-content tracking-tight border-b-4 border-brand pb-2 inline-block">
                            {t("aboutUs.title")}
                        </h1>
                    </div>
                </header>

                <div className="grid gap-8 animate-slide-up delay-100">
                    <div className="premium-glass border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl space-y-16">
                        <section className="relative">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-brand/10 rounded-2xl text-brand">
                                    <Target size={28} />
                                </div>
                                <h2 className="text-3xl font-bold text-content">{t("aboutUs.sections.mission.title")}</h2>
                            </div>
                            <p className="text-xl text-content-muted leading-relaxed text-justify">
                                {t("aboutUs.sections.mission.content")}
                            </p>
                        </section>

                        <section className="relative">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-brand/10 rounded-2xl text-brand">
                                    <Eye size={28} />
                                </div>
                                <h2 className="text-3xl font-bold text-content">{t("aboutUs.sections.vision.title")}</h2>
                            </div>
                            <p className="text-xl text-content-muted leading-relaxed text-justify">
                                {t("aboutUs.sections.vision.content")}
                            </p>
                        </section>

                        <section className="relative">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-brand/10 rounded-2xl text-brand">
                                    <ShieldCheck size={28} />
                                </div>
                                <h2 className="text-3xl font-bold text-content">{t("aboutUs.sections.values.title")}</h2>
                            </div>
                            <p className="text-xl text-content-muted leading-relaxed text-justify">
                                {t("aboutUs.sections.values.content")}
                            </p>
                        </section>

                        <section className="relative pt-12 border-t border-white/5">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-brand/10 rounded-2xl text-brand">
                                    <Users size={28} />
                                </div>
                                <h2 className="text-3xl font-bold text-content">{t("aboutUs.sections.team.title")}</h2>
                            </div>
                            <p className="text-xl text-content-muted leading-relaxed text-justify">
                                {t("aboutUs.sections.team.content")}
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
