export function DirectoryPage({
  familySearch,
  setFamilySearch,
  handleExportFamiliesCsv,
  filteredFamilies,
  families,
  selectedFamilyId,
  setSelectedFamilyId,
  selectedFamilyLifetime,
  selectedFamilyPendingBoli,
  selectedFamilyTransactions,
  formatCurrency,
  permissions,
  handleFamilySubmit,
  familyForm,
  setFamilyForm,
  working,
  handleImportFamiliesCsv,
  familyCsvImport,
  setFamilyCsvImport,
}) {
  return (
    <section className="panel-grid two-column">
      <article className="panel">
        <div className="panel-head">
          <h2>Family Master Profiles</h2>
          <p>Shravak CRM grouped by family_id.</p>
        </div>
        <label className="filter-control">
          Search Profiles
          <input
            value={familySearch}
            onChange={(event) => setFamilySearch(event.target.value)}
            placeholder="Search by ID, name, gotra, phone, address"
          />
        </label>
        <div className="action-row">
          <button type="button" className="secondary-btn" onClick={handleExportFamiliesCsv}>
            Export Families CSV
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Family ID</th>
                <th>Head of Family</th>
                <th>Gotra</th>
                <th>Primary WhatsApp</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredFamilies.length === 0 && (
                <tr>
                  <td colSpan="5">
                    {families.length === 0 ? 'No family profiles found.' : 'No families match this search.'}
                  </td>
                </tr>
              )}
              {filteredFamilies.map((family) => (
                <tr key={family.familyId}>
                  <td>{family.familyId}</td>
                  <td>{family.headName}</td>
                  <td>{family.gotra}</td>
                  <td>{family.whatsapp}</td>
                  <td>{family.address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Donation History View</h2>
          <p>Lifetime contributions and pending Boli for selected family.</p>
        </div>
        <label>
          Family Profile
          <select value={selectedFamilyId} onChange={(event) => setSelectedFamilyId(event.target.value)}>
            {families.map((family) => (
              <option key={family.familyId} value={family.familyId}>
                {family.familyId} - {family.headName}
              </option>
            ))}
          </select>
        </label>
        <div className="stats-inline">
          <div>
            <span>Lifetime Contributions</span>
            <strong>{formatCurrency(selectedFamilyLifetime)}</strong>
          </div>
          <div>
            <span>Pending Boli</span>
            <strong>{formatCurrency(selectedFamilyPendingBoli)}</strong>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Type</th>
                <th>Fund</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {selectedFamilyTransactions.length === 0 && (
                <tr>
                  <td colSpan="5">No donations linked to this family.</td>
                </tr>
              )}
              {selectedFamilyTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.id}</td>
                  <td>{transaction.type}</td>
                  <td>{transaction.fundCategory}</td>
                  <td>{transaction.cancelled ? `${transaction.status} (Cancelled)` : transaction.status}</td>
                  <td>{formatCurrency(transaction.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {permissions.manageDevotees && (
          <form className="stack-form" onSubmit={handleFamilySubmit}>
            <h3>Add Devotee Family</h3>
            <label>
              Head of Family Name
              <input
                value={familyForm.headName}
                onChange={(event) => setFamilyForm((current) => ({ ...current, headName: event.target.value }))}
              />
            </label>
            <label>
              Gotra
              <input
                value={familyForm.gotra}
                onChange={(event) => setFamilyForm((current) => ({ ...current, gotra: event.target.value }))}
              />
            </label>
            <label>
              Primary WhatsApp (+91 validation)
              <input
                value={familyForm.whatsapp}
                onChange={(event) => setFamilyForm((current) => ({ ...current, whatsapp: event.target.value }))}
                placeholder="+919876543210"
              />
            </label>
            <label>
              Address
              <input
                value={familyForm.address}
                onChange={(event) => setFamilyForm((current) => ({ ...current, address: event.target.value }))}
              />
            </label>
            <button type="submit" disabled={working}>Create Family Profile</button>
          </form>
        )}

        {permissions.manageDevotees && (
          <form className="stack-form" onSubmit={handleImportFamiliesCsv}>
            <h3>Bulk Family Import (CSV)</h3>
            <textarea
              value={familyCsvImport}
              onChange={(event) => setFamilyCsvImport(event.target.value)}
              placeholder={'familyId,headName,gotra,whatsapp,address\nFAM-0101,Sample Jain,Kashyap,+919876543210,Jaipur'}
              rows={6}
            />
            <button type="submit" disabled={working}>Import Families CSV</button>
          </form>
        )}
      </article>
    </section>
  )
}
