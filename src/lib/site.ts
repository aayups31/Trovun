export const SITE_NAME = 'Trovun';
export const SITE_URL = 'https://www.trovun.ca';
export const SITE_DESCRIPTION =
  'A private student marketplace for buying and selling textbooks, electronics, clothing, and household essentials around the University of Waterloo.';

export function absoluteUrl(path = '/') {
  return new URL(path, SITE_URL).toString();
}
