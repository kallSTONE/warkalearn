import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://warka.site';
  
  return { 
    rules: [
      { 
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/dashboard'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin', '/api', '/dashboard'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}