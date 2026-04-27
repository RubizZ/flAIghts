export default {
  // Context separator
  contextSeparator: '_',

  // Key separator used in translation keys
  keySeparator: '.',

  // Namespaces to extract
  namespaces: ['translation'],

  // Default namespace
  defaultNS: 'translation',

  // Locales to generate
  locales: ['en', 'es'],

  // Output directory
  output: 'src/i18n/languages/$LOCALE.json',

  // Input files
  input: ['src/**/*.{js,jsx,ts,tsx}'],

  // Sort keys in alphabetical order
  sort: true,

  // Keep existing translations
  keepRemoved: false,

  // Use keys as default values
  useKeysAsDefaultValue: true,

  // Options for different languages
  defaultValue: (lng, ns, key) => {
    if (lng === 'en') {
      return '';
    }
    return '';
  },

  // React-i18next options
  react: {
    useTranslation: true,
    withTranslation: false,
    transSupportBasicHtmlNodes: true,
    transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'],
  },
}
