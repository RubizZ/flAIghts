import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicy() {
    const { t, i18n } = useTranslation();

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 theme-transition">
            <div className="mb-8">
                <Link to="/" className="text-brand hover:text-brand-hover inline-flex items-center gap-2 transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    {t("privacyPolicy.backToHome")}
                </Link>
            </div>
            
            <h1 className="text-4xl font-bold text-content mb-8">{t("privacyPolicy.title")}</h1>
            
            <div className="space-y-6 text-content-muted leading-relaxed">
                <section>
                    <h2 className="text-2xl font-semibold text-content mb-3">{t("privacyPolicy.sections.information.title")}</h2>
                    <p>{t("privacyPolicy.sections.information.content")}</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-content mb-3">{t("privacyPolicy.sections.howWeUse.title")}</h2>
                    <p>
                        {t("privacyPolicy.sections.howWeUse.content")}
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mt-2">
                        <li>{t("privacyPolicy.sections.howWeUse.items.item1")}</li>
                        <li>{t("privacyPolicy.sections.howWeUse.items.item2")}</li>
                        <li>{t("privacyPolicy.sections.howWeUse.items.item3")}</li>
                        <li>{t("privacyPolicy.sections.howWeUse.items.item4")}</li>
                        <li>{t("privacyPolicy.sections.howWeUse.items.item5")}</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-content mb-3">{t("privacyPolicy.sections.security.title")}</h2>
                    <p>{t("privacyPolicy.sections.security.content")}</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-content mb-3">{t("privacyPolicy.sections.cookies.title")}</h2>
                    <p>{t("privacyPolicy.sections.cookies.content")}</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-content mb-3">{t("privacyPolicy.sections.contact.title")}</h2>
                    <p>{t("privacyPolicy.sections.contact.content")}</p>
                </section>
                
                <p className="pt-8 text-sm opacity-75">
                    {t("privacyPolicy.lastUpdated")}: {new Date().toLocaleDateString(i18n.language || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>
        </div>
    );
}
