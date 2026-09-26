import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Warka Learn',
    short_name: 'Warka Learn',
    description: 'Online courses, business skills, and English learning for learners in Ethiopia.',
    start_url: '/', 
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f766e',
    icons: [
      {
        src: '/assets/Icon/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/assets/Icon/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/assets/Icon/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
