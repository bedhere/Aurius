import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { HomepageMediaItem, SiteContent } from '../../api/types';
import '../../assets/styles/pages-public.css';

const fallbackSlides: HomepageMediaItem[] = [
  {
    id: 'hero-1',
    type: 'image',
    src: '/uploads/brand/home-banner-1.png',
    alt: 'AURIUS Bold Vision banner',
  },
  {
    id: 'hero-2',
    type: 'image',
    src: '/uploads/brand/home-banner-2.png',
    alt: 'AURIUS sustainable partnership banner',
  },
  {
    id: 'hero-3',
    type: 'image',
    src: '/uploads/brand/home-banner-3.png',
    alt: 'AURIUS smart toilet feature banner',
  },
  {
    id: 'hero-4',
    type: 'image',
    src: '/uploads/brand/home-banner-4.png',
    alt: 'AURIUS three-stage whole house filtration banner',
  },
];

export default function Home() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    api.get<SiteContent>('/api/site-content').then(setContent).catch(() => setContent(null));
  }, []);

  const slides = content?.homepageMedia?.length ? content.homepageMedia : fallbackSlides;

  useEffect(() => {
    setActive((current) => (current >= slides.length ? 0 : current));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const changeSlide = (direction: -1 | 1) => {
    setActive((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <section className="aurius-home" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="aurius-home__carousel">
        <div className="aurius-home__slide-stage">
          {slides.map((slide, index) => (
            <div
              className={`aurius-home__slide${index === active ? ' aurius-home__slide--active' : ''}`}
              aria-hidden={index !== active}
              key={slide.id}
            >
              {slide.type === 'video' ? (
                <video autoPlay={index === active} muted loop playsInline poster={slide.poster ?? undefined}>
                  <source src={slide.src} />
                </video>
              ) : (
                <img src={slide.src} alt={slide.alt ?? 'AURIUS'} />
              )}
            </div>
          ))}
          {slides.length > 1 && (
            <>
              <button className="aurius-home__nav-button aurius-home__nav-button--previous" type="button" aria-label="Previous slide" onClick={() => changeSlide(-1)}>
                <span aria-hidden="true">&#8249;</span>
              </button>
              <button className="aurius-home__nav-button aurius-home__nav-button--next" type="button" aria-label="Next slide" onClick={() => changeSlide(1)}>
                <span aria-hidden="true">&#8250;</span>
              </button>
            </>
          )}
        </div>
        <div className="aurius-home__quality-stage">
          {[1, 2, 3, 4].map((index) => (
            <img
              className={`aurius-home__quality${index === (active % 4) + 1 ? ' aurius-home__quality--active' : ''}`}
              src={`/uploads/brand/home-quality-${index}.png`}
              alt={index === (active % 4) + 1 ? 'Australian quality and certification information' : ''}
              aria-hidden={index !== (active % 4) + 1}
              key={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
