import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Scale, ArrowLeft, CheckCircle, ShieldAlert, FileText, RefreshCcw, Info } from "lucide-react";

export default function TermsOfService() {
    const { t, i18n } = useTranslation();

    return (
        <div className="min-h-svh py-16 px-6 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-brand/10 rounded-full blur-[100px] -z-10" />

            <div className="max-w-4xl mx-auto">
                <div className="mb-10 animate-fade-in">
                    <Link to="/" className="group inline-flex items-center gap-2 text-brand font-semibold hover:text-brand-hover transition-all duration-300">
                        <div className="p-2 rounded-full bg-brand/10 group-hover:bg-brand/20 transition-colors">
                            <ArrowLeft size={18} />
                        </div>
                        {t("termsOfService.backToHome")}
                    </Link>
                </div>

                <header className="mb-16 animate-slide-up">
                    <div className="flex items-start gap-5">
                        <div className="p-3 bg-brand/10 rounded-2xl text-brand shrink-0">
                            <Scale size={28} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-content tracking-tight border-b-4 border-brand pb-2 inline-block">
                            {t("termsOfService.title")}
                        </h1>
                    </div>
                </header>

                <div className="animate-slide-up delay-100">
                    <div className="premium-glass border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl space-y-12">
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle size={22} className="text-brand" />
                                <h2 className="text-2xl font-bold text-content">{t("termsOfService.sections.acceptance.title")}</h2>
                            </div>
                            <p className="text-content-muted leading-relaxed text-justify">{t("termsOfService.sections.acceptance.content")}</p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <ShieldAlert size={22} className="text-brand" />
                                <h2 className="text-2xl font-bold text-content">{t("termsOfService.sections.privacy.title")}</h2>
                            </div>
                            <p className="text-content-muted leading-relaxed text-justify">
                                {t("termsOfService.sections.privacy.content")}{' '}
                                <Link to="/privacy" className="text-brand hover:text-brand-hover font-bold underline underline-offset-4 decoration-2 transition-all">
                                    {t("termsOfService.sections.privacy.link")}
                                </Link>
                                {' '}{t("termsOfService.sections.privacy.contentAfter")}
                            </p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <FileText size={22} className="text-brand" />
                                <h2 className="text-2xl font-bold text-content">{t("termsOfService.sections.useSite.title")}</h2>
                            </div>
                            <p className="text-content-muted leading-relaxed text-justify">{t("termsOfService.sections.useSite.content")}</p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <Info size={22} className="text-brand" />
                                <h2 className="text-2xl font-bold text-content">{t("termsOfService.sections.liability.title")}</h2>
                            </div>
                            <p className="text-content-muted leading-relaxed text-justify">{t("termsOfService.sections.liability.content")}</p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <RefreshCcw size={22} className="text-brand" />
                                <h2 className="text-2xl font-bold text-content">{t("termsOfService.sections.changes.title")}</h2>
                            </div>
                            <p className="text-content-muted leading-relaxed text-justify">{t("termsOfService.sections.changes.content")}</p>
                        </section>

                        <div className="mt-12 pt-8 border-t border-white/5 text-sm text-content-muted/60">
                            <p>
                                {t("termsOfService.lastUpdated")}: {new Date().toLocaleDateString(i18n.language || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
