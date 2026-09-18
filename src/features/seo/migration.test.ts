// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server';
import nextConfig from '../../../next.config';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';

describe('Trovun domain migration', () => {
  it.each(['myunimarket.com', 'www.myunimarket.com', 'trovun.ca'])(
    'permanently redirects %s while preserving paths and query parameters',
    async (host) => {
      const response = await unstable_getResponseFromNextConfig({
        url: `https://${host}/waterloo-marketplace/books?source=shared`,
        nextConfig,
      });
      expect(response.status).toBe(308);
      expect(response.headers.get('location')).toBe(
        'https://www.trovun.ca/waterloo-marketplace/books?source=shared',
      );
    },
  );

  it.each(['www.trovun.ca', 'localhost:3000', 'preview.vercel.app'])(
    'does not redirect the canonical or development host %s',
    async (host) => {
      const response = await unstable_getResponseFromNextConfig({
        url: `https://${host}/`,
        nextConfig,
      });
      expect(response.headers.get('location')).toBeNull();
    },
  );

  it('advertises only unique public URLs on the canonical domain', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain('https://www.trovun.ca/');
    expect(urls).toContain('https://www.trovun.ca/waterloo-marketplace');
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      const parsed = new URL(url);
      expect(parsed.origin).toBe('https://www.trovun.ca');
      expect(parsed.pathname === '/' || parsed.pathname.startsWith('/waterloo-marketplace')).toBe(
        true,
      );
    }
    expect(robots().sitemap).toBe('https://www.trovun.ca/sitemap.xml');
  });
});
