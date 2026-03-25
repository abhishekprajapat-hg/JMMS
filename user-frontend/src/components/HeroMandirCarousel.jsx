import { useEffect, useMemo, useState } from 'react'
import { toAbsoluteUrl } from '../api'
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
      title: '\u0936\u093e\u0902\u0924 \u0926\u0930\u094d\u0936\u0928 \u0915\u093e \u0935\u093e\u0924\u093e\u0935\u0930\u0923',
      description: '\u0926\u0948\u0928\u093f\u0915 \u092d\u0915\u094d\u0924\u093f \u0914\u0930 \u091a\u093f\u0902\u0924\u0928 \u0915\u0947 \u0932\u093f\u090f \u092e\u0902\u0926\u093f\u0930 \u0905\u0928\u0941\u092d\u0935 \u0915\u093e \u090f\u0915 \u0936\u093e\u0902\u0924 \u0926\u0943\u0936\u094d\u092f \u092a\u094d\u0930\u0935\u0947\u0936\u0964',
    },
    {
      image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jain%20temple%20012.jpg',
      title: '\u092a\u0935\u093f\u0924\u094d\u0930 \u0938\u094d\u0925\u093e\u092a\u0924\u094d\u092f \u0914\u0930 \u092a\u094d\u0930\u0915\u093e\u0936',
      description: '\u092e\u0902\u0926\u093f\u0930 \u0926\u0943\u0936\u094d\u092f \u0905\u092a\u0928\u0947 \u0906\u092a \u092c\u0926\u0932\u0924\u0947 \u0939\u0948\u0902, \u091c\u093f\u0938\u0938\u0947 \u0939\u094b\u092e\u092a\u0947\u091c \u091c\u0940\u0935\u0902\u0924, \u0936\u093e\u0902\u0924 \u0914\u0930 \u0909\u092a\u093e\u0938\u0928\u093e \u0938\u0947 \u091c\u0941\u0921\u093c\u093e \u0932\u0917\u0947\u0964',
    },
    {
      image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jain%20Mandir.JPG',
      title: '\u0917\u0924\u093f\u0936\u0940\u0932 \u092e\u0902\u0926\u093f\u0930 \u091d\u0932\u0915\u093f\u092f\u093e\u0901',
      description: '\u090f\u0915 \u092a\u094d\u0930\u0940\u092e\u093f\u092f\u092e \u0939\u0940\u0930\u094b \u0917\u0948\u0932\u0930\u0940 \u091c\u094b \u0926\u0930\u094d\u0936\u0928, \u0938\u094d\u0925\u093e\u0928 \u0914\u0930 \u0906\u0927\u094d\u092f\u093e\u0924\u094d\u092e\u093f\u0915 \u090a\u0937\u094d\u092e\u093e \u0915\u094b \u0915\u0947\u0902\u0926\u094d\u0930 \u092e\u0947\u0902 \u0930\u0916\u0924\u0940 \u0939\u0948\u0964',
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

function DefaultOverlay({ copy, displayIndex, slides, minHeightClassName, nextSlide, setActiveIndex }) {
  return (
    <div className={`relative flex ${minHeightClassName} flex-col justify-between p-5 sm:p-6`}>
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
          onClick={nextSlide}
          className="focus-ring absolute bottom-5 right-5 inline-flex rounded-full border border-white/20 bg-black/24 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm transition hover:bg-black/36 sm:bottom-6 sm:right-6"
          aria-label={copy.nextSlide}
        >
          {copy.next}
        </button>
      )}
    </div>
  )
}

export function HeroMandirCarousel({
  homeData,
  mandirProfile,
  language = 'en',
  className = '',
  minHeightClassName = 'min-h-[420px]',
  renderOverlay = null,
}) {
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
      eyebrow: '\u092e\u0902\u0926\u093f\u0930 \u092b\u094b\u091f\u094b \u0917\u0948\u0932\u0930\u0940',
      autoLabel: '\u0911\u091f\u094b \u0938\u094d\u0932\u093e\u0907\u0921',
      counter: '\u092b\u094b\u091f\u094b',
      morning: '\u092a\u094d\u0930\u093e\u0924\u0903 \u0926\u0930\u094d\u0936\u0928',
      evening: '\u0938\u093e\u092f\u0902 \u0926\u0930\u094d\u0936\u0928',
      next: '\u0905\u0917\u0932\u093e',
      nextSlide: '\u0905\u0917\u0932\u093e \u092e\u0902\u0926\u093f\u0930 \u092b\u094b\u091f\u094b \u0926\u093f\u0916\u093e\u090f\u0901',
      goToSlide: (index) => `\u092e\u0902\u0926\u093f\u0930 \u092b\u094b\u091f\u094b ${index + 1} \u092a\u0930 \u091c\u093e\u090f\u0901`,
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

  const nextSlide = () => {
    setActiveIndex((current) => (current + 1) % slides.length)
  }

  return (
    <section
      className={`relative overflow-hidden bg-[#120c08] shadow-[0_32px_90px_rgba(0,0,0,0.28)] ${className}`}
    >
      <div className={`relative ${minHeightClassName}`}>
        {slides.map((slide, index) => (
          <div
            key={slide.id || `${slide.title}-${index}`}
            className={`absolute inset-0 transition-opacity duration-700 ${index === displayIndex ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={index !== displayIndex}
          >
            <img
              src={slide.image}
              alt={slide.alt || slide.title}
              className={`h-full w-full object-cover ${minHeightClassName}`}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,7,5,0.16),rgba(10,7,5,0.38),rgba(10,7,5,0.92))]" />
          </div>
        ))}

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,214,170,0.18),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(234,88,12,0.26),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(9,6,4,0.62),rgba(9,6,4,0.22),rgba(9,6,4,0.5))]" />

        {renderOverlay ? (
          renderOverlay({
            slides,
            displayIndex,
            setActiveIndex,
            nextSlide,
            carouselCopy: copy,
          })
        ) : (
          <DefaultOverlay
            copy={copy}
            displayIndex={displayIndex}
            slides={slides}
            minHeightClassName={minHeightClassName}
            nextSlide={nextSlide}
            setActiveIndex={setActiveIndex}
          />
        )}
      </div>
    </section>
  )
}
