import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return ['myunimarket.com', 'www.myunimarket.com', 'trovun.ca'].map((host) => ({
      source: '/:path*',
      has: [{ type: 'host' as const, value: host.replaceAll('.', '\\.') }],
      destination: 'https://www.trovun.ca/:path*',
      permanent: true,
    }));
  },
  images: {
    qualities: [75, 88, 90, 92],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
