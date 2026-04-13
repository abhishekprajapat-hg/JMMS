import { isDatePastDue, toISODate } from '../utils/validation'
import {
  CollapsiblePanelHead,
  PanelCollapseActions,
  usePanelSections,
} from '../components/PanelCollapseControls'

const INVENTORY_SECTION_KEYS = {
  vault: 'vault',
  audit: 'audit',
}

const INVENTORY_ALL_SECTION_KEYS = [INVENTORY_SECTION_KEYS.vault, INVENTORY_SECTION_KEYS.audit]

export function InventoryPage({
  permissions,
  handleAssetSubmit,
  assetForm,
  setAssetForm,
  working,
  handleCheckoutSubmit,
  checkoutForm,
  setCheckoutForm,
  assets,
  families,
  assetCheckouts,
  familyLookup,
  formatDate,
  handleReturnCheckout,
}) {
  const {
    collapsedSections,
    areAllVisibleSectionsCollapsed,
    areAllVisibleSectionsExpanded,
    toggleSection,
    setAllVisibleSections,
  } = usePanelSections(INVENTORY_ALL_SECTION_KEYS)

  return (
    <section className="panel-grid two-column">
      <PanelCollapseActions
        areAllVisibleSectionsCollapsed={areAllVisibleSectionsCollapsed}
        areAllVisibleSectionsExpanded={areAllVisibleSectionsExpanded}
        setAllVisibleSections={setAllVisibleSections}
      />
      <article className="panel">
        <CollapsiblePanelHead
          sectionKey={INVENTORY_SECTION_KEYS.vault}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          controlsId="inventory-vault-panel"
          title="Bhandar Asset Vault"
          subtitle="Asset register and checkout flow."
        />
        <div id="inventory-vault-panel" hidden={collapsedSections[INVENTORY_SECTION_KEYS.vault]}>
          {permissions.manageInventory && (
            <>
              <form className="stack-form" onSubmit={handleAssetSubmit}>
                <h3>Add Asset</h3>
                <label>
                  Asset Name
                  <input
                    value={assetForm.name}
                    onChange={(event) => setAssetForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label>
                  Total Units
                  <input
                    type="number"
                    min="1"
                    value={assetForm.totalUnits}
                    onChange={(event) => setAssetForm((current) => ({ ...current, totalUnits: event.target.value }))}
                  />
                </label>
                <button type="submit" disabled={working}>Register Asset</button>
              </form>

              <form className="stack-form" onSubmit={handleCheckoutSubmit}>
                <h3>Checkout Asset</h3>
                <label>
                  Asset
                  <select
                    value={checkoutForm.assetId}
                    onChange={(event) => setCheckoutForm((current) => ({ ...current, assetId: event.target.value }))}
                  >
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} ({asset.availableUnits}/{asset.totalUnits})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Devotee Family
                  <select
                    value={checkoutForm.familyId}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, familyId: event.target.value }))
                    }
                  >
                    {families.map((family) => (
                      <option key={family.familyId} value={family.familyId}>
                        {family.familyId} - {family.headName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantity
                  <input
                    type="number"
                    min="1"
                    value={checkoutForm.quantity}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, quantity: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Expected Return Date
                  <input
                    type="date"
                    value={checkoutForm.expectedReturnDate}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, expectedReturnDate: event.target.value }))
                    }
                  />
                </label>
                <button type="submit" disabled={working}>Check Out Asset</button>
              </form>
            </>
          )}
        </div>
      </article>

      <article className="panel">
        <CollapsiblePanelHead
          sectionKey={INVENTORY_SECTION_KEYS.audit}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          controlsId="inventory-audit-panel"
          title="Inventory Audit"
          subtitle="Overdue checkouts are flagged red."
        />
        <div id="inventory-audit-panel" hidden={collapsedSections[INVENTORY_SECTION_KEYS.audit]}>
          <div className="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Name</th>
                  <th>Total</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>{asset.id}</td>
                    <td>{asset.name}</td>
                    <td>{asset.totalUnits}</td>
                    <td>{asset.availableUnits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Checkout ID</th>
                  <th>Asset</th>
                  <th>Family</th>
                  <th>Qty</th>
                  <th>Expected Return</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {assetCheckouts.map((checkout) => {
                  const isOverdue =
                    checkout.status === 'Checked Out' && isDatePastDue(checkout.expectedReturnDate, toISODate())
                  return (
                    <tr key={checkout.id} className={isOverdue ? 'row-alert' : ''}>
                      <td>{checkout.id}</td>
                      <td>{assets.find((asset) => asset.id === checkout.assetId)?.name || checkout.assetId}</td>
                      <td>{familyLookup[checkout.familyId]?.headName || checkout.familyId}</td>
                      <td>{checkout.quantity}</td>
                      <td>{formatDate(checkout.expectedReturnDate)}</td>
                      <td>{checkout.status}</td>
                      <td>
                        {checkout.status === 'Checked Out' && permissions.manageInventory ? (
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => handleReturnCheckout(checkout.id)}
                            disabled={working}
                          >
                            Mark Returned
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </section>
  )
}
