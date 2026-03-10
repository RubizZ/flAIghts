import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

import en from "./languages/en.json"
import es from "./languages/es.json"

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: true,

    load: "languageOnly",

    interpolation: {
      escapeValue: false
    },

    resources: {
      en: {
        translation: en
      },
      es: {
        translation: es
      }
    }
  })

export default i18n