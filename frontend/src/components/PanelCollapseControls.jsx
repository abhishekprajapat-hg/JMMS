import { useMemo, useState } from 'react'

function createCollapsedState(sectionKeys) {
  return sectionKeys.reduce((accumulator, key) => {
    accumulator[key] = false
    return accumulator
  }, {})
}

export function usePanelSections(allSectionKeys, visibleSectionKeys = allSectionKeys) {
  const [collapsedSections, setCollapsedSections] = useState(() => createCollapsedState(allSectionKeys))

  const areAllVisibleSectionsCollapsed = useMemo(
    () => visibleSectionKeys.every((key) => collapsedSections[key]),
    [collapsedSections, visibleSectionKeys],
  )

  const areAllVisibleSectionsExpanded = useMemo(
    () => visibleSectionKeys.every((key) => !collapsedSections[key]),
    [collapsedSections, visibleSectionKeys],
  )

  function toggleSection(sectionKey) {
    setCollapsedSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }))
  }

  function setAllVisibleSections(isCollapsed) {
    setCollapsedSections((current) => {
      const next = { ...current }
      visibleSectionKeys.forEach((key) => {
        next[key] = isCollapsed
      })
      return next
    })
  }

  return {
    collapsedSections,
    areAllVisibleSectionsCollapsed,
    areAllVisibleSectionsExpanded,
    toggleSection,
    setAllVisibleSections,
  }
}

export function PanelCollapseActions({
  areAllVisibleSectionsCollapsed,
  areAllVisibleSectionsExpanded,
  setAllVisibleSections,
  className = 'panel-collapse-actions dashboard-bulk-actions',
}) {
  return (
    <div className={className}>
      <button
        type="button"
        className="make-chip-btn dashboard-bulk-action-btn"
        onClick={() => setAllVisibleSections(true)}
        disabled={areAllVisibleSectionsCollapsed}
      >
        Collapse all
      </button>
      <button
        type="button"
        className="make-chip-btn dashboard-bulk-action-btn"
        onClick={() => setAllVisibleSections(false)}
        disabled={areAllVisibleSectionsExpanded}
      >
        Expand all
      </button>
    </div>
  )
}

export function CollapsiblePanelHead({
  sectionKey,
  collapsedSections,
  toggleSection,
  controlsId,
  title,
  subtitle,
  titleAs = 'h2',
  className = 'panel-head dashboard-panel-head',
}) {
  const HeadingTag = titleAs
  const isCollapsed = collapsedSections[sectionKey]

  return (
    <div className={isCollapsed ? `${className} collapsed` : className}>
      <div>
        <HeadingTag>{title}</HeadingTag>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <button
        type="button"
        className="make-chip-btn dashboard-toggle-btn"
        onClick={() => toggleSection(sectionKey)}
        aria-expanded={!isCollapsed}
        aria-controls={controlsId}
      >
        {isCollapsed ? 'Expand' : 'Collapse'}
      </button>
    </div>
  )
}
