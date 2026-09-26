import Link from 'next/link'
import { Calendar, User } from 'lucide-react'
import { format } from 'date-fns'
import articles from '@/data/articles'
import { Badge } from '@/components/ui/badge'

 
export default function Articles() {
  return (
    <div className="bg-[var(--bg)]">
      <div className="max-w-6xl mx-auto px-6 py-12">  
        <div className="mb-10">
          <p className="text-sm uppercase tracking-widest text-[var(--text-muted)]">Insights & Updates</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] mt-2">Learning Articles</h1>
          <p className="text-[var(--text-muted)] mt-3 max-w-2xl">
            Practical tips, study plans, and skill-building guidance to support your learning journey.
          </p>
        </div> 
   
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => {
            const date = new Date(article.date)
            return ( 
              <Link 
                key={article.id}
                href={`/blog/${article.id}`}
                className="group block rounded-[var(--radius-lg)] border border-border bg-card shadow-sm hover:shadow-md transition overflow-hidden"
              > 
                <div className="relative"> 
                  <img
                     src={article.image}
                     alt={article.title}
                     className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />   
                  <div className="absolute left-4 top-4">
                     <Badge variant="secondary" className="bg-[var(--bg-elev-2)] text-[var(--primary-300)]">
                       {article.category}
                     </Badge>
                  </div>
                </div> 

                <div className="p-5">
                  <h2 className="text-xl font-semibold text-[var(--text)] mb-2 line-clamp-2">
                    {article.title}
                  </h2> 
                  <p className="text-sm text-[var(--text-muted)] line-clamp-3 mb-4">
                    {article.excerpt}
                  </p> 
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />  {article.author}
                    </span>
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> {format(date, 'PPP')}
                    </span>
                  </div> 
                </div> 
              </Link>   
            )
          })}
        </div>
      </div>
    </div> 
  ) 
} 
  