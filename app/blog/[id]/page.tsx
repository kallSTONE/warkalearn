import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, User } from 'lucide-react'
import { format } from 'date-fns'
import articles from '@/data/articles'

type Props = {
    params: { id: string }
}

export default function ArticlePage({ params }: Props) {
    const id = Number(params.id)
    const article = articles.find((a) => a.id === id)
    if (!article) return notFound()

    const date = new Date(article.date)
    const related = articles
        .filter((a) => a.id !== article.id && a.category === article.category)
        .slice(0, 3)

    const fallback = articles
        .filter((a) => a.id !== article.id && !related.find((r) => r.id === a.id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, Math.max(0, 3 - related.length))

    const relatedArticles = [...related, ...fallback]

    return (
        <div className="bg-[var(--bg)]">
            <div className="max-w-5xl mx-auto px-6 py-12">
                <Card className="bg-card">
                    <CardHeader>
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="secondary" className="bg-[var(--bg-elev-2)] text-[var(--primary-300)]">
                                {article.category}
                            </Badge>
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4" /> {article.author}
                            </span>
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" /> {format(date, 'PPP')}
                            </span>
                        </div>
                        <CardTitle className="text-2xl md:text-3xl mt-4">{article.title}</CardTitle>
                        <CardDescription className="text-base text-[var(--text-muted)]">
                            {article.excerpt}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-8">
                            <img
                                src={article.image}
                                alt={article.title}
                                className="w-full rounded-[var(--radius-lg)] object-cover max-h-80"
                            />
                        </div>
                        <div className="prose max-w-full">
                            <p>{article.body}</p>
                        </div>
                    </CardContent>
                </Card>

                {relatedArticles.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-xl font-semibold text-[var(--text)] mb-6">Related Articles</h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {relatedArticles.map((rel) => {
                                const relDate = new Date(rel.date)
                                return (
                                    <Link
                                        key={rel.id}
                                        href={`/blog/${rel.id}`}
                                        className="group block rounded-[var(--radius-lg)] border border-border bg-card shadow-sm hover:shadow-md transition overflow-hidden"
                                    >
                                        <div className="relative">
                                            <img
                                                src={rel.image}
                                                alt={rel.title}
                                                className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                            />
                                            <div className="absolute left-3 top-3">
                                                <Badge variant="secondary" className="bg-[var(--bg-elev-2)] text-[var(--primary-300)]">
                                                    {rel.category}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="text-base font-semibold text-[var(--text)] line-clamp-2 mb-2">
                                                {rel.title}
                                            </h3>
                                            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                                                <span className="flex items-center gap-2">
                                                    <User className="h-3.5 w-3.5" /> {rel.author}
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    <Calendar className="h-3.5 w-3.5" /> {format(relDate, 'PPP')}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
