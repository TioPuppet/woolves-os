/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Security + PWA-friendly headers. The service worker is a custom file in
  // /public/sw.js registered client-side (see ServiceWorkerRegister), so we
  // avoid next-pwa to stay compatible with the App Router and TS strict mode.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
