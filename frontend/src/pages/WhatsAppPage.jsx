export function WhatsAppPage() {
  return (
    <section className="panel-grid">
      <article className="panel">
        <div className="panel-head">
          <h2>WhatsApp Receipt Auto-Send</h2>
          <p>Yahan ab koi manual setup nahi hai.</p>
        </div>
        <div className="stack-form">
          <p className="hint">
            Devotee ka payment verify hote hi receipt WhatsApp par automatically bhej di jayegi.
          </p>
          <p className="hint">
            Required backend values <code>backend/.env</code> se liye ja rahe hain, isliye admin panel mein kuch bharna
            nahi padega.
          </p>
        </div>
      </article>
    </section>
  )
}
