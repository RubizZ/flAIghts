import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { Heart, ArrowLeft, ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function Acknowledgements() {
    const { t, i18n } = useTranslation();

    return (
        <div className="min-h-svh py-16 px-6 relative overflow-hidden">
            <Helmet>
                <title>{t("seo.acknowledgements.title")}</title>
                <meta name="description" content={t("seo.acknowledgements.description")} />
            </Helmet>
            {/* Background decorative elements */}
            <div className="absolute top-1/4 right-0 w-80 h-80 bg-brand/5 rounded-full blur-3xl -z-10" />

            <div className="max-w-4xl mx-auto">
                <div className="mb-10 animate-fade-in">
                    <Link to="/" className="group inline-flex items-center gap-2 text-brand font-semibold hover:text-brand-hover transition-all duration-300">
                        <div className="p-2 rounded-full bg-brand/10 group-hover:bg-brand/20 transition-colors">
                            <ArrowLeft size={18} />
                        </div>
                        {t("acknowledgements.backToHome")}
                    </Link>
                </div>

                <header className="mb-16 animate-slide-up">
                    <div className="flex items-start gap-5">
                        <div className="p-3 bg-brand/10 rounded-2xl text-brand shrink-0">
                            <Heart size={28} className="fill-brand/20" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-content tracking-tight border-b-4 border-brand pb-2 inline-block">
                            {t("acknowledgements.title")}
                        </h1>
                    </div>
                </header>

                <div className="animate-slide-up delay-100">
                    <div className="premium-glass border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
                        <section className="prose prose-lg prose-invert max-w-none">
                            <p className="text-xl text-content-muted leading-relaxed text-justify">
                                <Trans
                                    i18nKey="acknowledgements.content"
                                    components={[
                                        <br key="br" />,
                                        <a
                                            key="serpapi"
                                            href="https://serpapi.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-brand hover:text-brand-hover font-bold inline-flex items-center gap-1 underline underline-offset-4 decoration-2"
                                        >
                                            SerpApi <ExternalLink size={14} />
                                        </a>
                                    ]}
                                />
                            </p>
                        </section>

                        <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center text-sm text-content-muted/60">
                            <p>
                                {t("privacyPolicy.lastUpdated")}: {new Date().toLocaleDateString(i18n.language || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <span className="font-bold tracking-widest uppercase opacity-30 italic">flAIghts Team</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
