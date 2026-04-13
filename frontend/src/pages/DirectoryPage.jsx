import { useMemo, useState } from 'react'
import {
  CollapsiblePanelHead,
  PanelCollapseActions,
  usePanelSections,
} from '../components/PanelCollapseControls'

const DIRECTORY_SECTION_KEYS = {
  familiesHub: 'familiesHub',
}

const DIRECTORY_ALL_SECTION_KEYS = [DIRECTORY_SECTION_KEYS.familiesHub]

function getTransactionStatusLabel(transaction) {
  if (!transaction) return '-'
  if (transaction.cancelled) return `${transaction.status} (Cancelled)`
  return transaction.status || '-'
}

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
  const [activeTab, setActiveTab] = useState('profiles')
  const {
    collapsedSections,
    areAllVisibleSectionsCollapsed,
    areAllVisibleSectionsExpanded,
    toggleSection,
    setAllVisibleSections,
  } = usePanelSections(DIRECTORY_ALL_SECTION_KEYS)

  const selectedFamily = useMemo(
    () => families.find((family) => family.familyId === selectedFamilyId) || null,
    [families, selectedFamilyId],
  )

  const transactionOverview = useMemo(() => {
    const total = selectedFamilyTransactions.length
    const completed = selectedFamilyTransactions.filter((transaction) => transaction.status === 'Paid').length
    const cancelled = selectedFamilyTransactions.filter((transaction) => Boolean(transaction.cancelled)).length

    return {
      total,
      completed,
      cancelled,
    }
  }, [selectedFamilyTransactions])

  const canManageFamilies = Boolean(permissions.manageDevotees)

  function jumpToLedger(familyId) {
    setSelectedFamilyId(familyId)
    setActiveTab('ledger')
  }

  return (
    <section className="panel-grid directory-page">
      <PanelCollapseActions
        areAllVisibleSectionsCollapsed={areAllVisibleSectionsCollapsed}
        areAllVisibleSectionsExpanded={areAllVisibleSectionsExpanded}
        setAllVisibleSections={setAllVisibleSections}
      />

      <article className="panel directory-shell">
        <CollapsiblePanelHead
          sectionKey={DIRECTORY_SECTION_KEYS.familiesHub}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          controlsId="directory-families-hub-panel"
          title="Families Command Center"
          subtitle="Search, analyze, onboard, and import families from one modern workspace."
        />

        <div
          id="directory-families-hub-panel"
          hidden={collapsedSections[DIRECTORY_SECTION_KEYS.familiesHub]}
        >
          <div className="directory-overview-grid">
            <div className="directory-overview-card">
              <span>Total Families</span>
              <strong>{families.length}</strong>
              <small>Master devotee directory</small>
            </div>
            <div className="directory-overview-card is-muted">
              <span>Search Results</span>
              <strong>{filteredFamilies.length}</strong>
              <small>Matching current filter</small>
            </div>
            <div className="directory-overview-card is-success">
              <span>Selected Family</span>
              <strong>{selectedFamily?.familyId || '-'}</strong>
              <small>{selectedFamily?.headName || 'Choose from profiles tab'}</small>
            </div>
            <div className="directory-overview-card is-warning">
              <span>Family Lifetime</span>
              <strong>{formatCurrency(selectedFamilyLifetime)}</strong>
              <small>Pending boli {formatCurrency(selectedFamilyPendingBoli)}</small>
            </div>
          </div>

          <div className="directory-tabs" role="tablist" aria-label="Family management views">
            <button
              type="button"
              className={`directory-tab-btn${activeTab === 'profiles' ? ' active' : ''}`}
              onClick={() => setActiveTab('profiles')}
            >
              Family Profiles
            </button>
            <button
              type="button"
              className={`directory-tab-btn${activeTab === 'ledger' ? ' active' : ''}`}
              onClick={() => setActiveTab('ledger')}
            >
              Donation Ledger
            </button>
            {canManageFamilies ? (
              <button
                type="button"
                className={`directory-tab-btn${activeTab === 'create' ? ' active' : ''}`}
                onClick={() => setActiveTab('create')}
              >
                Add Family
              </button>
            ) : null}
            {canManageFamilies ? (
              <button
                type="button"
                className={`directory-tab-btn${activeTab === 'import' ? ' active' : ''}`}
                onClick={() => setActiveTab('import')}
              >
                Bulk Import
              </button>
            ) : null}
          </div>

          {activeTab === 'profiles' ? (
            <div className="directory-surface">
              <div className="directory-toolbar">
                <label className="directory-toolbar-field">
                  Search Profiles
                  <input
                    value={familySearch}
                    onChange={(event) => setFamilySearch(event.target.value)}
                    placeholder="Search by ID, name, gotra, phone, address"
                  />
                </label>
                <div className="directory-toolbar-actions">
                  <button type="button" className="secondary-btn" onClick={handleExportFamiliesCsv}>
                    Export Families CSV
                  </button>
                </div>
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
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFamilies.length === 0 ? (
                      <tr>
                        <td colSpan="6">
                          {families.length === 0 ? 'No family profiles found.' : 'No families match this search.'}
                        </td>
                      </tr>
                    ) : (
                      filteredFamilies.map((family) => (
                        <tr key={family.familyId}>
                          <td>{family.familyId}</td>
                          <td>{family.headName}</td>
                          <td>{family.gotra}</td>
                          <td>{family.whatsapp}</td>
                          <td>{family.address}</td>
                          <td>
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => jumpToLedger(family.familyId)}
                            >
                              View Ledger
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === 'ledger' ? (
            <div className="directory-surface">
              <div className="directory-toolbar">
                <label className="directory-toolbar-field">
                  Family Profile
                  <select value={selectedFamilyId} onChange={(event) => setSelectedFamilyId(event.target.value)}>
                    {families.map((family) => (
                      <option key={family.familyId} value={family.familyId}>
                        {family.familyId} - {family.headName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="directory-ledger-stats">
                <div>
                  <span>Lifetime Contributions</span>
                  <strong>{formatCurrency(selectedFamilyLifetime)}</strong>
                </div>
                <div>
                  <span>Pending Boli</span>
                  <strong>{formatCurrency(selectedFamilyPendingBoli)}</strong>
                </div>
                <div>
                  <span>Total Transactions</span>
                  <strong>{transactionOverview.total}</strong>
                </div>
                <div>
                  <span>Paid / Cancelled</span>
                  <strong>
                    {transactionOverview.completed} / {transactionOverview.cancelled}
                  </strong>
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
                    {selectedFamilyTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="5">No donations linked to this family.</td>
                      </tr>
                    ) : (
                      selectedFamilyTransactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>{transaction.id}</td>
                          <td>{transaction.type}</td>
                          <td>{transaction.fundCategory}</td>
                          <td>{getTransactionStatusLabel(transaction)}</td>
                          <td>{formatCurrency(transaction.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === 'create' && canManageFamilies ? (
            <div className="directory-surface">
              <form className="stack-form directory-form-grid" onSubmit={handleFamilySubmit}>
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
                <label className="directory-form-span-2">
                  Address
                  <input
                    value={familyForm.address}
                    onChange={(event) => setFamilyForm((current) => ({ ...current, address: event.target.value }))}
                  />
                </label>
                <div className="action-row directory-form-span-2">
                  <button type="submit" disabled={working}>Create Family Profile</button>
                </div>
              </form>
            </div>
          ) : null}

          {activeTab === 'import' && canManageFamilies ? (
            <div className="directory-surface">
              <form className="stack-form" onSubmit={handleImportFamiliesCsv}>
                <label>
                  CSV Data
                  <textarea
                    value={familyCsvImport}
                    onChange={(event) => setFamilyCsvImport(event.target.value)}
                    placeholder={'familyId,headName,gotra,whatsapp,address\nFAM-0101,Sample Jain,Kashyap,+919876543210,Jaipur'}
                    rows={8}
                  />
                </label>
                <div className="action-row">
                  <button type="submit" disabled={working}>Import Families CSV</button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </article>
    </section>
  )
}
