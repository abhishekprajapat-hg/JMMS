import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'

const sections = [
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
]

export function AboutMandirPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Temple Information"
        title="About Mandir"
        description="Learn about our spiritual values, daily activities, and community seva initiatives."
      />

      <Card className="overflow-hidden p-0">
        <img
          src="https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1400&q=80"
          alt="Temple prayer hall"
          className="h-64 w-full object-cover sm:h-80"
        />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <h2 className="font-serif text-2xl text-orange-900 dark:text-orange-100">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{section.text}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

