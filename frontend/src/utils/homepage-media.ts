import type { HomepageMediaItem } from '../api/types';

// Shared by the public fallback and the editor so adding a slide keeps all four originals.
export const defaultHomepageMedia: HomepageMediaItem[] = [
  { id: 'hero-1', type: 'image', src: '/uploads/brand/home-banner-1.png', alt: 'AURIUS Bold Vision banner' },
  { id: 'hero-2', type: 'image', src: '/uploads/brand/home-banner-2.png', alt: 'AURIUS sustainable partnership banner' },
  { id: 'hero-3', type: 'image', src: '/uploads/brand/home-banner-3.png', alt: 'AURIUS smart toilet feature banner' },
  { id: 'hero-4', type: 'image', src: '/uploads/brand/home-banner-4.png', alt: 'AURIUS three-stage whole house filtration banner' },
];
