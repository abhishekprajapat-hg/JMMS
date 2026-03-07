export function LanguageToggle({ language, onChangeLanguage, className = '' }) {
  return (
    <div className={`language-toggle ${className}`.trim()} data-i18n-skip="true">
      <button
        type="button"
        className={language === 'en' ? 'language-toggle-btn active' : 'language-toggle-btn'}
        onClick={() => onChangeLanguage('en')}
      >
        English
      </button>
      <button
        type="button"
        className={language === 'hi' ? 'language-toggle-btn active' : 'language-toggle-btn'}
        onClick={() => onChangeLanguage('hi')}
      >
        Hindi
      </button>
    </div>
  )
}
