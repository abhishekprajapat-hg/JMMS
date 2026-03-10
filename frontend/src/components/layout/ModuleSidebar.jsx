function ModuleButton({ module, isActive, onSelectModule }) {
  return (
    <button
      type="button"
      className={isActive ? 'make-side-link active' : 'make-side-link'}
      onClick={() => onSelectModule(module.id)}
      title={module.label}
    >
      <span className="make-side-icon" aria-hidden="true">{module.icon}</span>
      <span className="make-side-label">{module.label}</span>
    </button>
  )
}

export function ModuleSidebar({
  sidebarModules,
  mobilePrimaryModules,
  mobileOverflowModules,
  activeModule,
  isMoreMenuOpen,
  isMoreTabActive,
  onSelectModule,
  onToggleMoreMenu,
}) {
  return (
    <>
      <nav className="make-sidebar" aria-label="Module navigation">
        <div className="make-sidebar-head">
          <p>Navigation</p>
          <small>{sidebarModules.length} modules</small>
        </div>
        <div className="make-sidebar-desktop">
          {sidebarModules.map((module) => (
            <ModuleButton
              key={module.id}
              module={module}
              isActive={activeModule === module.id}
              onSelectModule={onSelectModule}
            />
          ))}
        </div>
        <div className="make-sidebar-mobile-tabs">
          {mobilePrimaryModules.map((module) => (
            <ModuleButton
              key={module.id}
              module={module}
              isActive={activeModule === module.id}
              onSelectModule={onSelectModule}
            />
          ))}
          {mobileOverflowModules.length > 0 && (
            <button
              type="button"
              className={isMoreTabActive ? 'make-side-link make-side-more active' : 'make-side-link make-side-more'}
              onClick={onToggleMoreMenu}
              title="More"
              aria-expanded={isMoreMenuOpen}
              aria-controls="mobile-more-nav"
            >
              <span className="make-side-icon" aria-hidden="true">&#8942;</span>
              <span className="make-side-label">More</span>
            </button>
          )}
        </div>
      </nav>

      {mobileOverflowModules.length > 0 && (
        <div
          id="mobile-more-nav"
          className={isMoreMenuOpen ? 'make-sidebar-mobile-more open' : 'make-sidebar-mobile-more'}
        >
          {mobileOverflowModules.map((module) => (
            <ModuleButton
              key={module.id}
              module={module}
              isActive={activeModule === module.id}
              onSelectModule={onSelectModule}
            />
          ))}
        </div>
      )}
    </>
  )
}
