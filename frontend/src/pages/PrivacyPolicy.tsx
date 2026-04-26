import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, ArrowLeft, Lock, Database, Cookie, Mail, Info } from "lucide-react";

export default function PrivacyPolicy() {
    const { t, i18n } = useTranslation();

    return (
        <div className="min-h-svh py-16 px-6 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand/10 rounded-full blur-[100px] -z-10" />

            <div className="max-w-4xl mx-auto">
                <div className="mb-10 animate-fade-in">
                    <Link to="/" className="group inline-flex items-center gap-2 text-brand font-semibold hover:text-brand-hover transition-all duration-300">
                        <div className="p-2 rounded-full bg-brand/10 group-hover:bg-brand/20 transition-colors">
                            <ArrowLeft size={18} />
                        </div>
                        {t("privacyPolicy.backToHome")}
                    </Link>
                </div>

                <header className="mb-16 animate-slide-up">
                    <div className="flex items-start gap-5">
                        <div className="p-3 bg-brand/10 rounded-2xl text-brand shrink-0">
                            <Shield size={28} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-content tracking-tight border-b-4 border-brand pb-2 inline-block">
                            {t("privacyPolicy.title")}
                        </h1>
                    </div>
                </header>

                <div className="animate-slide-up delay-100">
                    <div className="premium-glass border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl space-y-12">
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <Info size={22} className="text-brand" />
                                <h2 className="text-2xl font-bold text-content">{t("privacyPolicy.sections.information.title")}</h2>
                            </div>
                            <p className="text-content-muted leading-relaxed text-justify">{t("privacyPolicy.sections.information.content")}</p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <Database size={22} className="text-brand" />
                                <h2 className="text-2xl font-bold text-content">{t("privacyPolicy.sections.howWeUse.title")}</h2>
                            </div>
                            <p className="text-content-muted leading-relaxed mb-4 text-justify">
                                {t("privacyPolicy.sections.howWeUse.content")}
                            </p>
                            <ul className="space-y-3">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-content-muted/80 bg-white/5 p-4 rounded-xl border border-white/5 transition-colors hover:bg-white/10 group">
                                        <div className="h-2 w-2 rounded-full bg-brand shrink-0 mt-1.5 group-hover:scale-125 transition-transform" />
                                        <span className="leading-relaxed text-justify">
                                            {t(`privacyPolicy.sections.howWeUse.items.item${i}`)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <Lock size={22} className="text-brand" />
                                <h2 className="text-2xl font-bold text-content">{t("privacyPolicy.sections.security.title")}</h2>
                            </div>
                            <p className="text-content-muted leading-relaxed text-justify">{t("privacyPolicy.sections.security.content")}</p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <Cookie size={22} className="text-brand" />
                                <h2 className="text-2xl font-bold text-content">{t("privacyPolicy.sections.cookies.title")}</h2>
                            </div>
                            <p className="text-content-muted leading-relaxed text-justify">{t("privacyPolicy.sections.cookies.content")}</p>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <Mail size={22} className="text-brand" />
                                <h2 className="text-2xl font-bold text-content">{t("privacyPolicy.sections.contact.title")}</h2>
                            </div>
                            <p className="text-content-muted leading-relaxed text-justify">{t("privacyPolicy.sections.contact.content")}</p>
                        </section>

                        <div className="mt-12 pt-8 border-t border-white/5 text-sm text-content-muted/60">
                            <p>
                                {t("privacyPolicy.lastUpdated")}: {new Date().toLocaleDateString(i18n.language || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
