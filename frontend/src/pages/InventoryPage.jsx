import { isDatePastDue, toISODate } from '../utils/validation'

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
  return (
    <section className="panel-grid two-column">
      <article className="panel">
        <div className="panel-head">
          <h2>Bhandar Asset Vault</h2>
          <p>Asset register and checkout flow.</p>
        </div>

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
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Inventory Audit</h2>
          <p>Overdue checkouts are flagged red.</p>
        </div>
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
      </article>
    </section>
  )
}
