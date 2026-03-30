import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function TermsOfService() {
    const { t, i18n } = useTranslation();

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 theme-transition">
            <div className="mb-8">
                <Link to="/" className="text-brand hover:text-brand-hover inline-flex items-center gap-2 transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    {t("termsOfService.backToHome")}
                </Link>
            </div>
            
            <h1 className="text-4xl font-bold text-content mb-8">{t("termsOfService.title")}</h1>
            
            <div className="space-y-6 text-content-muted leading-relaxed">
                <section>
                    <h2 className="text-2xl font-semibold text-content mb-3">{t("termsOfService.sections.acceptance.title")}</h2>
                    <p>{t("termsOfService.sections.acceptance.content")}</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-content mb-3">{t("termsOfService.sections.privacy.title")}</h2>
                    <p>
                        {t("termsOfService.sections.privacy.content")}
                        <Link to="/privacy" className="text-brand hover:underline">{t("termsOfService.sections.privacy.link")}</Link>
                        {t("termsOfService.sections.privacy.contentAfter")}
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-content mb-3">{t("termsOfService.sections.useSite.title")}</h2>
                    <p>{t("termsOfService.sections.useSite.content")}</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-content mb-3">{t("termsOfService.sections.liability.title")}</h2>
                    <p>{t("termsOfService.sections.liability.content")}</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-content mb-3">{t("termsOfService.sections.changes.title")}</h2>
                    <p>{t("termsOfService.sections.changes.content")}</p>
                </section>
                
                <p className="pt-8 text-sm opacity-75">
                    {t("termsOfService.lastUpdated")}: {new Date().toLocaleDateString(i18n.language || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>
        </div>
    );
}
