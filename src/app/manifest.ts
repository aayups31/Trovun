import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Trovun Waterloo',
    short_name: 'Trovun',
    description: 'A private student marketplace for the University of Waterloo community.',
    start_url: '/',
    display: 'standalone',
    background_color: '#06080c',
    theme_color: '#080c13',
    icons: [
      {
        src: '/brand/trovun-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/brand/trovun-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
