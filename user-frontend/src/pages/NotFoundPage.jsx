import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="panel ring-1 ring-amber-100/60">
      <div className="panel-head space-y-1">
        <h2>Page Not Found</h2>
        <p>The page you requested does not exist.</p>
      </div>
      <Link className="inline-link" to="/">Go to Home</Link>
    </section>
  )
}
