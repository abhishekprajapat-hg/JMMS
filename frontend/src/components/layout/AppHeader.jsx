import { LanguageToggle } from './LanguageToggle'

export function AppHeader({
  language,
  onChangeLanguage,
  currentUser,
  compactRoleLabel,
  mandirProfile,
  onLogout,
  fallbackAddress,
}) {
  return (
    <section className="make-app-header-row">
      <div className="make-brand-mark">
        <span className="make-brand-icon" aria-hidden="true">&#128725;</span>
        <div>
          <h2>Admin Portal</h2>
          <p>{mandirProfile.name || 'Jain Mandir Management'}</p>
        </div>
      </div>
      <div className="make-header-actions">
        <LanguageToggle language={language} onChangeLanguage={onChangeLanguage} />
        <div className="make-user-block">
          <strong>{currentUser.fullName}</strong>
          <span>Signed in as {compactRoleLabel}</span>
          <small>{mandirProfile.address || fallbackAddress}</small>
        </div>
        <button type="button" className="make-chip-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </section>
  )
}
