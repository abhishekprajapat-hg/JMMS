import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { useApp } from '../context/AppContext'
import { pickByLanguage } from '../utils/i18n'

export function NotFoundPage() {
  const { language } = useApp()
  const copy = pickByLanguage(language, {
    en: {
      title: 'Page Not Found',
      description: 'The page you are looking for does not exist in this mandir portal. Let\'s guide you back to a calmer route.',
      button: 'Return Home',
    },
    hi: {
      title: 'पेज नहीं मिला',
      description: 'जिस पेज को आप खोज रहे हैं वह इस मंदिर पोर्टल में मौजूद नहीं है। चलिए आपको फिर से सही स्थान पर ले चलते हैं।',
      button: 'होम पर लौटें',
    },
  })

  return (
    <div className="mx-auto mt-16 w-full max-w-3xl">
      <Card className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">404</p>
        <h1 className="mt-3 font-serif text-6xl leading-none text-orange-950 dark:text-amber-50">{copy.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-zinc-600 dark:text-zinc-300">
          {copy.description}
        </p>
        <Link
          to="/"
          className="focus-ring mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,#c2410c,#f59e0b)] px-6 py-3 text-sm font-bold text-white shadow-[0_16px_28px_rgba(194,65,12,0.24)]"
        >
          {copy.button}
        </Link>
      </Card>
    </div>
  )
}
