import { Link } from 'react-router-dom'
import { Card } from '../components/Card'

export function NotFoundPage() {
  return (
    <div className="mx-auto mt-16 w-full max-w-xl">
      <Card className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">404</p>
        <h1 className="mt-2 font-serif text-4xl text-orange-900 dark:text-orange-100">Page Not Found</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
          The page you are looking for does not exist in this mandir portal.
        </p>
        <Link
          to="/"
          className="focus-ring mt-5 inline-flex rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Return Home
        </Link>
      </Card>
    </div>
  )
}

