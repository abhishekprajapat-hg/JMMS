import { useEffect, useMemo, useState } from 'react'
import { toAbsoluteUrl } from '../api'
import { Card } from './Card'
import { pickByLanguage } from '../utils/i18n'

const FALLBACK_SLIDES = {
  en: [
    {
      image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jain%20Temple.jpg',
      title: 'Shant darshan atmosphere',
      description: 'A calm visual entry into the mandir experience, designed for daily devotion and reflection.',
    },
    {
      image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jain%20temple%20012.jpg',
      title: 'Sacred architecture and light',
      description: 'Temple visuals rotate automatically so the homepage feels alive, serene, and rooted in worship.',
    },
    {
      image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jain%20Mandir.JPG',
      title: 'Mandir moments in motion',
      description: 'A premium hero gallery that keeps darshan, space, and spiritual warmth front and center.',
    },
  ],
  hi: [
    {
      image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jain%20Temple.jpg',
      title: 'शांत दर्शन का वातावरण',
      description: 'दैनिक भक्ति और चिंतन के लिए मंदिर अनुभव का एक शांत दृश्य प्रवेश।',
    },
    {
      image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jain%20temple%20012.jpg',
      title: 'पवित्र स्थापत्य और प्रकाश',
      description: 'मंदिर दृश्य अपने आप बदलते हैं, जिससे होमपेज जीवंत, शांत और उपासना से जुड़ा लगे।',
    },
    {
      image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jain%20Mandir.JPG',
      title: 'गतिशील मंदिर झलकियाँ',
      description: 'एक प्रीमियम हीरो गैलरी जो दर्शन, स्थान और आध्यात्मिक ऊष्मा को केंद्र में रखती है।',
    },
  ],
}

function normalizeSlide(entry, index, language) {
  if (!entry) return null

  if (typeof entry === 'string') {
    return {
      id: `slide-${index}`,
      image: toAbsoluteUrl(entry),
      title: FALLBACK_SLIDES[language][index % FALLBACK_SLIDES[language].length].title,
      description: FALLBACK_SLIDES[language][index % FALLBACK_SLIDES[language].length].description,
      alt: FALLBACK_SLIDES[language][index % FALLBACK_SLIDES[language].length].title,
    }
  }

  const image = entry.image || entry.src || entry.url || entry.photo || entry.thumbnailUrl || entry.coverUrl || ''
  if (!image) return null

  return {
    id: entry.id || entry.slug || `slide-${index}`,
    image: toAbsoluteUrl(image),
    title: entry.title || entry.name || FALLBACK_SLIDES[language][index % FALLBACK_SLIDES[language].length].title,
    description: entry.description || entry.caption || FALLBACK_SLIDES[language][index % FALLBACK_SLIDES[language].length].description,
    alt: entry.alt || entry.title || entry.name || FALLBACK_SLIDES[language][index % FALLBACK_SLIDES[language].length].title,
  }
}

function pickGalleryArrays(homeData, mandirProfile) {
  return [
    mandirProfile?.heroImages,
    mandirProfile?.galleryImages,
    mandirProfile?.images,
    mandirProfile?.photos,
    homeData?.heroImages,
    homeData?.galleryImages,
    homeData?.images,
    homeData?.photos,
    homeData?.gallery,
    homeData?.banners,
  ].filter(Array.isArray)
}

export function HeroMandirCarousel({ homeData, mandirProfile, language = 'en' }) {
  const [activeIndex, setActiveIndex] = useState(0)

  const copy = pickByLanguage(language, {
    en: {
      eyebrow: 'Mandir Photo Gallery',
      autoLabel: 'Auto Sliding',
      counter: 'Photos',
      morning: 'Morning Darshan',
      evening: 'Evening Darshan',
      next: 'Next',
      nextSlide: 'Show next mandir photo',
      goToSlide: (index) => `Go to mandir photo ${index + 1}`,
    },
    hi: {
      eyebrow: 'मंदिर फोटो गैलरी',
      autoLabel: 'ऑटो स्लाइड',
      counter: 'फोटो',
      morning: 'प्रातः दर्शन',
      evening: 'सायं दर्शन',
      next: 'अगला',
      nextSlide: 'अगला मंदिर फोटो दिखाएँ',
      goToSlide: (index) => `मंदिर फोटो ${index + 1} पर जाएँ`,
    },
  })

  const slides = useMemo(() => {
    const galleryArrays = pickGalleryArrays(homeData, mandirProfile)
    const normalized = galleryArrays
      .flatMap((items) => items)
      .map((entry, index) => normalizeSlide(entry, index, language))
      .filter(Boolean)
      .slice(0, 6)

    return normalized.length ? normalized : FALLBACK_SLIDES[language]
  }, [homeData, language, mandirProfile])
  const displayIndex = slides.length ? activeIndex % slides.length : 0

  useEffect(() => {
    if (slides.length <= 1) return undefined

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, 4500)

    return () => window.clearInterval(intervalId)
  }, [slides.length])

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative min-h-[420px]">
        {slides.map((slide, index) => (
          <div
            key={slide.id || `${slide.title}-${index}`}
            className={`absolute inset-0 transition-opacity duration-700 ${index === displayIndex ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={index !== displayIndex}
          >
            <img
              src={slide.image}
              alt={slide.alt || slide.title}
              className="h-full min-h-[420px] w-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,12,8,0.08),rgba(18,12,8,0.24),rgba(18,12,8,0.82))]" />
          </div>
        ))}

        <div className="relative flex min-h-[420px] flex-col justify-between p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex rounded-full border border-white/25 bg-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
              {copy.eyebrow}
            </span>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden="true" />
              {copy.autoLabel}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                {copy.counter} {displayIndex + 1}/{slides.length}
              </span>
              <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                {copy.morning} 6:00 AM - 11:00 AM
              </span>
              <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                {copy.evening} 5:00 PM - 9:00 PM
              </span>
            </div>

            <h2 className="mt-4 max-w-lg font-serif text-3xl text-white sm:text-4xl">{slides[displayIndex]?.title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-orange-50/92">
              {slides[displayIndex]?.description}
            </p>

            <div className="mt-5 flex items-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={`${slide.id || slide.title}-dot`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`focus-ring h-2.5 rounded-full transition ${index === displayIndex ? 'w-9 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/70'}`}
                  aria-label={copy.goToSlide(index)}
                />
              ))}
            </div>
          </div>

          {slides.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveIndex((current) => (current + 1) % slides.length)}
              className="focus-ring absolute bottom-5 right-5 inline-flex rounded-full border border-white/20 bg-black/24 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm transition hover:bg-black/36 sm:bottom-6 sm:right-6"
              aria-label={copy.nextSlide}
            >
              {copy.next}
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
