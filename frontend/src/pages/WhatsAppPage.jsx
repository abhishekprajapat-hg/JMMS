export function WhatsAppPage({
  handleSaveWhatsAppConfig,
  whatsAppConfig,
  setWhatsAppConfig,
  whatsappProviders,
  working,
  permissions,
  runDueDateSweep,
  runRetrySweep,
  cronLastRunDate,
  retrySweepLastRunAt,
  whatsAppRetryQueue,
  whatsAppLogs,
  formatDate,
}) {
  return (
    <section className="panel-grid two-column">
      <article className="panel">
        <div className="panel-head">
          <h2>WhatsApp Automation Engine</h2>
          <p>Official API ready configuration and trigger monitoring.</p>
        </div>
        <form className="stack-form" onSubmit={handleSaveWhatsAppConfig}>
          <label>
            Provider
            <select
              value={whatsAppConfig.provider}
              onChange={(event) =>
                setWhatsAppConfig((current) => ({ ...current, provider: event.target.value }))
              }
            >
              {whatsappProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </label>
          <label>
            API Endpoint URL
            <input
              value={whatsAppConfig.apiUrl || ''}
              onChange={(event) => setWhatsAppConfig((current) => ({ ...current, apiUrl: event.target.value }))}
              placeholder="https://your-server.example.com/whatsapp/send-template"
            />
          </label>
          <label>
            Access Token
            <input
              type="password"
              value={whatsAppConfig.accessToken || ''}
              onChange={(event) =>
                setWhatsAppConfig((current) => ({ ...current, accessToken: event.target.value }))
              }
            />
          </label>
          <label>
            Business WhatsApp Number
            <input
              value={whatsAppConfig.businessNumber || ''}
              onChange={(event) =>
                setWhatsAppConfig((current) => ({ ...current, businessNumber: event.target.value }))
              }
              placeholder="+911234567890"
            />
          </label>
          <button type="submit" disabled={working}>Save WhatsApp Config</button>
          {permissions.runCron && (
            <div className="action-row">
              <button type="button" onClick={runDueDateSweep} disabled={working}>
                Run Due Date Reminder Sweep
              </button>
              <button type="button" onClick={runRetrySweep} disabled={working}>
                Run Retry Sweep
              </button>
            </div>
          )}
        </form>
        <p className="hint">
          Cron policy: due reminders run daily at 10:00 AM, retries run every 15 minutes. Last due sweep date:{' '}
          {cronLastRunDate || 'Not yet run'}. Last retry sweep: {retrySweepLastRunAt || 'Not yet run'}.
        </p>
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Message Delivery Log</h2>
          <p>Trigger 1 (instant receipt) and Trigger 2 (pledge reminder) audit trail.</p>
        </div>
        <div className="table-wrap compact">
          <table>
            <thead>
              <tr>
                <th>Retry Queue ID</th>
                <th>Transaction</th>
                <th>Template</th>
                <th>Attempt</th>
                <th>Next Retry</th>
              </tr>
            </thead>
            <tbody>
              {whatsAppRetryQueue.length === 0 && (
                <tr>
                  <td colSpan="5">No queued retries.</td>
                </tr>
              )}
              {whatsAppRetryQueue.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.transactionId}</td>
                  <td>{item.templateType}</td>
                  <td>{item.attempt}</td>
                  <td>{formatDate(item.nextRetryAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Status</th>
                <th>Template</th>
                <th>Trigger</th>
                <th>Family</th>
                <th>Phone</th>
                <th>Attempt</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {whatsAppLogs.length === 0 && (
                <tr>
                  <td colSpan="8">No WhatsApp events yet.</td>
                </tr>
              )}
              {whatsAppLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                  <td>{log.status}</td>
                  <td>{log.templateType}</td>
                  <td>{log.trigger}</td>
                  <td>{log.familyName}</td>
                  <td>{log.phone}</td>
                  <td>{log.attempt || 1}</td>
                  <td>{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
