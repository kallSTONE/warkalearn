import { MetadataRoute } from 'next';
import articles from '@/data/articles';
  
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://warka.site';
  const today = new Date();

  const staticPages = [
    { url: '/', changeFrequency: 'daily' as const, priority: 1.0 },
    { url: '/learn', changeFrequency: 'daily' as const, priority: 0.95 },
    { url: '/blog', changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: '/about', changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: '/community', changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: '/resources', changeFrequency: 'weekly' as const, priority: 0.75 },
    { url: '/shop', changeFrequency: 'weekly' as const, priority: 0.75 },
  ];
   
  const pageEntries = staticPages.map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: today,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    images: [
      {
        loc: `${baseUrl}/assets/Icon/android-chrome-512x512.png`,
        title: 'Warka Learn logo',
        caption: 'Warka Learn educational platform logo',
      },
    ],
  }));

  const articleEntries = articles.map((article) => ({
    url: `${baseUrl}/blog/${article.id}`,
    lastModified: new Date(article.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
    images: [
      {
        loc: `${baseUrl}${article.image}`,
        title: article.title,
        caption: article.excerpt,
      },
    ],
  }));

  return [...pageEntries, ...articleEntries];
}