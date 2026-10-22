import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { HomepageMediaItem, SiteContent } from '../../api/types';
import { defaultHomepageMedia } from '../../utils/homepage-media';
import { useI18n } from '../../i18n/LanguageContext';
import '../../assets/styles/pages-public.css';

export default function Home() {
  const { t } = useI18n();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    api.get<SiteContent>('/api/site-content').then(setContent).catch(() => setContent(null));
  }, []);

  const slides: HomepageMediaItem[] = content?.homepageMedia?.length ? content.homepageMedia : defaultHomepageMedia;

  useEffect(() => {
    setActive((current) => (current >= slides.length ? 0 : current));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  return (
    <section className="aurius-home" aria-roledescription="carousel" aria-label="AURIUS">
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
        </div>
        <div className="aurius-home__quality-stage">
          {slides.length > 1 && (
            <button className="aurius-home__playback" type="button" aria-pressed={paused} onClick={() => setPaused((current) => !current)}>
              {t(paused ? 'home.resumeSlideshow' : 'home.pauseSlideshow')}
            </button>
          )}
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
