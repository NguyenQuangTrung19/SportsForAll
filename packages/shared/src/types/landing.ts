import type { SportSlug } from './sport.js';

export interface LandingImageView {
  sport: SportSlug;
  largeUrl: string;
  smallUrl: string;
  tileUrl: string;
  updatedAt: string;
  updatedByName: string | null;
}

export interface LandingImagesResponse {
  items: LandingImageView[];
}
