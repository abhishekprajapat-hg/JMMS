import {
  CollapsiblePanelHead,
  PanelCollapseActions,
  usePanelSections,
} from '../components/PanelCollapseControls'

const WHATSAPP_SECTION_KEYS = {
  autoSend: 'autoSend',
}

export function WhatsAppPage() {
  const {
    collapsedSections,
    areAllVisibleSectionsCollapsed,
    areAllVisibleSectionsExpanded,
    toggleSection,
    setAllVisibleSections,
  } = usePanelSections([WHATSAPP_SECTION_KEYS.autoSend])

  return (
    <section className="panel-grid">
      <PanelCollapseActions
        areAllVisibleSectionsCollapsed={areAllVisibleSectionsCollapsed}
        areAllVisibleSectionsExpanded={areAllVisibleSectionsExpanded}
        setAllVisibleSections={setAllVisibleSections}
      />
      <article className="panel">
        <CollapsiblePanelHead
          sectionKey={WHATSAPP_SECTION_KEYS.autoSend}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          controlsId="whatsapp-auto-send-panel"
          title="WhatsApp Receipt Auto-Send"
          subtitle="Yahan ab koi manual setup nahi hai."
        />
        <div id="whatsapp-auto-send-panel" hidden={collapsedSections[WHATSAPP_SECTION_KEYS.autoSend]}>
          <div className="stack-form">
            <p className="hint">
              Devotee ka payment verify hote hi receipt WhatsApp par automatically bhej di jayegi.
            </p>
            <p className="hint">
              Required backend values <code>backend/.env</code> se liye ja rahe hain, isliye admin panel mein kuch bharna
              nahi padega.
            </p>
          </div>
        </div>
      </article>
    </section>
  )
}
