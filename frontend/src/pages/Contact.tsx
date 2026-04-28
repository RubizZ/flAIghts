import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, MessageCircle, School, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function Contact() {
    const { t } = useTranslation();

    return (
        <div className="min-h-svh py-16 px-6 relative overflow-hidden">
            <Helmet>
                <title>{t("seo.contact.title")}</title>
                <meta name="description" content={t("seo.contact.description")} />
            </Helmet>
            {/* Decorative background blobs */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand/10 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="absolute top-1/2 -left-24 w-72 h-72 bg-brand/5 rounded-full blur-3xl -z-10" />

            <div className="max-w-5xl mx-auto">
                <div className="mb-10 animate-fade-in">
                    <Link to="/" className="group inline-flex items-center gap-2 text-brand font-semibold hover:text-brand-hover transition-all duration-300">
                        <div className="p-2 rounded-full bg-brand/10 group-hover:bg-brand/20 transition-colors">
                            <ArrowLeft size={18} />
                        </div>
                        {t("contact.backToHome")}
                    </Link>
                </div>
                
                <header className="mb-16 animate-slide-up">
                    <div className="flex items-start gap-5">
                        <div className="p-3 bg-brand/10 rounded-2xl text-brand shrink-0">
                            <Mail size={28} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-content tracking-tight border-b-4 border-brand pb-2 inline-block">
                            {t("contact.title")}
                        </h1>
                    </div>
                    <p className="text-xl text-content-muted max-w-2xl mt-8 animate-fade-in">
                        {t("contact.subtitle")}
                    </p>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-up delay-100">
                    <div className="premium-glass border border-white/10 p-10 rounded-[2.5rem] shadow-2xl hover:border-brand/30 transition-all duration-500 group">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-brand/10 rounded-2xl text-brand group-hover:scale-110 transition-transform duration-500">
                                <Mail size={32} />
                            </div>
                            <h2 className="text-3xl font-bold text-content">{t("contact.sections.support.title")}</h2>
                        </div>
                        <p className="text-lg text-content-muted leading-relaxed text-justify">
                            {t("contact.sections.support.content")}
                        </p>
                    </div>

                    <div className="premium-glass border border-white/10 p-10 rounded-[2.5rem] shadow-2xl hover:border-brand/30 transition-all duration-500 group">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-brand/10 rounded-2xl text-brand group-hover:scale-110 transition-transform duration-500">
                                <MessageCircle size={32} />
                            </div>
                            <h2 className="text-3xl font-bold text-content">{t("contact.sections.feedback.title")}</h2>
                        </div>
                        <p className="text-lg text-content-muted leading-relaxed text-justify">
                            {t("contact.sections.feedback.content")}
                        </p>
                    </div>

                    <div className="premium-glass border border-white/10 p-10 rounded-[2.5rem] shadow-2xl md:col-span-2 hover:border-brand/30 transition-all duration-500 group">
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                            <div className="p-5 bg-brand/10 rounded-2xl text-brand self-start group-hover:scale-110 transition-transform duration-500">
                                <School size={40} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-content mb-3">{t("contact.sections.university.title")}</h2>
                                <p className="text-lg text-content-muted leading-relaxed text-justify">
                                    {t("contact.sections.university.content")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
