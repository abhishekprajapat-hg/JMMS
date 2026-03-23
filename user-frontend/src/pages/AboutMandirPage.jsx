import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useApp } from '../context/AppContext'
import { pickByLanguage } from '../utils/i18n'

export function AboutMandirPage() {
  const { language } = useApp()
  const copy = pickByLanguage(language, {
    en: {
      eyebrow: 'Temple Information',
      title: 'About Mandir',
      description: 'Learn about our spiritual values, daily activities, and community seva initiatives.',
      imageAlt: 'Temple prayer hall',
      essence: 'Mandir Essence',
      imageTitle: 'A space for prayer, reflection, and shared spiritual discipline.',
      livingTradition: 'Living Tradition',
      livingTraditionTitle: 'A mandir that balances ritual depth with community care.',
      livingTraditionBody: 'Our space supports daily darshan, study, seva, and values-driven community programming for families, youth, and senior devotees alike.',
      morningDarshan: 'Morning Darshan',
      eveningDarshan: 'Evening Darshan',
      sections: [
        {
          title: 'Our Vision',
          text: 'To nurture a spiritual ecosystem rooted in ahimsa, anekant, compassion, and disciplined daily practice.',
        },
        {
          title: 'Temple Activities',
          text: 'Daily aarti, pravachan sessions, pathshala for children, and festival seva drives throughout the year.',
        },
        {
          title: 'Community Programs',
          text: 'Health camps, youth volunteering, eco-friendly initiatives, and support for senior devotees.',
        },
        {
          title: 'Seva Timings',
          text: 'Morning Darshan: 6:00 AM - 11:00 AM | Evening Darshan: 5:00 PM - 9:00 PM',
        },
      ],
    },
    hi: {
      eyebrow: 'मंदिर जानकारी',
      title: 'मंदिर परिचय',
      description: 'हमारे आध्यात्मिक मूल्यों, दैनिक गतिविधियों और सामुदायिक सेवा पहलों के बारे में जानें।',
      imageAlt: 'मंदिर प्रार्थना हॉल',
      essence: 'मंदिर का सार',
      imageTitle: 'प्रार्थना, चिंतन और साझा आध्यात्मिक अनुशासन का एक स्थल।',
      livingTradition: 'जीवंत परंपरा',
      livingTraditionTitle: 'एक ऐसा मंदिर जो अनुष्ठान की गहराई और समुदाय की सेवा में संतुलन रखता है।',
      livingTraditionBody: 'हमारा स्थान परिवारों, युवाओं और वरिष्ठ श्रद्धालुओं के लिए दैनिक दर्शन, अध्ययन, सेवा और मूल्य-आधारित सामुदायिक कार्यक्रमों का सहारा है।',
      morningDarshan: 'प्रातः दर्शन',
      eveningDarshan: 'सायं दर्शन',
      sections: [
        {
          title: 'हमारी दृष्टि',
          text: 'अहिंसा, अनेकांत, करुणा और अनुशासित दैनिक साधना पर आधारित आध्यात्मिक परिवेश का पोषण करना।',
        },
        {
          title: 'मंदिर गतिविधियाँ',
          text: 'दैनिक आरती, प्रवचन सत्र, बच्चों के लिए पाठशाला और वर्ष भर पर्व सेवा कार्यक्रम।',
        },
        {
          title: 'सामुदायिक कार्यक्रम',
          text: 'स्वास्थ्य शिविर, युवा स्वयंसेवा, पर्यावरण हितैषी पहल और वरिष्ठ श्रद्धालुओं के लिए सहयोग।',
        },
        {
          title: 'सेवा समय',
          text: 'प्रातः दर्शन: 6:00 AM - 11:00 AM | सायं दर्शन: 5:00 PM - 9:00 PM',
        },
      ],
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden p-0">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1400&q=80"
              alt={copy.imageAlt}
              className="h-[360px] w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(34,20,10,0.84))]" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">{copy.essence}</p>
              <h2 className="mt-2 font-serif text-4xl">{copy.imageTitle}</h2>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{copy.livingTradition}</p>
            <h2 className="mt-2 font-serif text-4xl text-orange-950 dark:text-amber-50">{copy.livingTraditionTitle}</h2>
            <p className="mt-4 text-sm leading-8 text-zinc-600 dark:text-zinc-300">
              {copy.livingTraditionBody}
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-orange-200/70 bg-white/72 px-4 py-4 dark:border-orange-900/30 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{copy.morningDarshan}</p>
              <p className="mt-2 font-serif text-3xl text-orange-950 dark:text-amber-50">6 AM</p>
            </div>
            <div className="rounded-[24px] border border-orange-200/70 bg-white/72 px-4 py-4 dark:border-orange-900/30 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">{copy.eveningDarshan}</p>
              <p className="mt-2 font-serif text-3xl text-orange-950 dark:text-amber-50">5 PM</p>
            </div>
          </div>
        </Card>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {copy.sections.map((section, index) => (
          <Card key={section.title}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">
              0{index + 1}
            </p>
            <h2 className="mt-3 font-serif text-3xl text-orange-950 dark:text-amber-50">{section.title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{section.text}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
