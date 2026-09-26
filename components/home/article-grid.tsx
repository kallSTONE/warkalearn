import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, User } from 'lucide-react'
import { formatDistance } from 'date-fns'
import articles from '@/public/data/articles'


export default function ArticleGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {articles.slice(0, 3).map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  )
}

interface ArticleCardProps {
  article: {
    id: number
    title: string
    excerpt: string
    image: string
    category: string
    author: string
    authorImage: string
    date: string
  }
} 
 
function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col h-full">
      <div className="aspect-video w-full relative overflow-hidden">
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />  
        <Badge className="absolute top-3 left-3" variant="secondary">{article.category}</Badge>
      </div> 

      <CardHeader className="pb-2 flex-grow">
        <CardTitle className="text-xl line-clamp-2 hover:text-primary transition-colors"> 
          <Link href={`/blog/${article.id}`}>{article.title}</Link>
        </CardTitle>
        <CardDescription className="line-clamp-3 mt-2">{article.excerpt}</CardDescription> 
      </CardHeader>
 
      <CardFooter className="flex items-center gap-4 border-t pt-4">
        <div className="flex items-center gap-2">
          <img
            src={article.authorImage}
            alt={article.author}
            className="w-6 h-6 rounded-full"
          /> 
          <span className="text-xs text-muted-foreground">{article.author}</span>
        </div> 
        <div className="flex items-center text-xs text-muted-foreground"> 
          <Calendar className="mr-1 h-3 w-3" />   
          <span>{formatDistance(new Date(article.date), new Date(), { addSuffix: true })}</span>
        </div> 
      </CardFooter>
    </Card>
  )
}