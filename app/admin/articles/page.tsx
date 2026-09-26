"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Eye, Edit2, Trash2, Calendar, User } from "lucide-react"

interface Article {
  id: number
  title: string
  author: string
  category: string
  views: number
  likes: number
  publishDate: string
  status: "published" | "draft" | "scheduled"
  readTime: number
}

const initialArticles: Article[] = [
  {
    id: 1,
    title: "Getting Started with React Hooks",
    author: "John Doe",
    category: "Programming",
    views: 2543,
    likes: 342,
    publishDate: "2024-03-15",
    status: "published",
    readTime: 8,
  },
  {
    id: 2,
    title: "Web Performance Best Practices",
    author: "Jane Smith",
    category: "Web Development",
    views: 1876,
    likes: 256,
    publishDate: "2024-03-10",
    status: "published",
    readTime: 12,
  },
  {
    id: 3,
    title: "Design Systems 101",
    author: "Mike Johnson",
    category: "Design",
    views: 1234,
    likes: 189,
    publishDate: "2024-03-05",
    status: "published",
    readTime: 10,
  },
  {
    id: 4,
    title: "Advanced TypeScript Patterns",
    author: "Sarah Williams",
    category: "Programming",
    views: 0,
    likes: 0,
    publishDate: "2024-03-20",
    status: "scheduled",
    readTime: 15,
  },
  {
    id: 5,
    title: "Building Scalable APIs",
    author: "Tom Brown",
    category: "Backend",
    views: 0,
    likes: 0,
    publishDate: "2024-03-18",
    status: "draft",
    readTime: 14,
  },
]

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>(initialArticles)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft" | "scheduled">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredArticles = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return articles.filter((article) => {
      const matchesSearch = article.title.toLowerCase().includes(q) || article.author.toLowerCase().includes(q)
      const matchesStatus = filterStatus === "all" || article.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [articles, searchTerm, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / itemsPerPage))

  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredArticles.slice(start, start + itemsPerPage)
  }, [filteredArticles, currentPage])

  const getVisiblePages = (page: number, pages: number) => {
    if (pages <= 3) return Array.from({ length: pages }, (_, index) => index + 1)
    if (page <= 2) return [1, 2, 3]
    if (page >= pages - 1) return [pages - 2, pages - 1, pages]
    return [page - 1, page, page + 1]
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    return (
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="px-3"
        >
          &lt;&lt;
        </Button>
        {getVisiblePages(currentPage, totalPages).map((page) => (
          <Button
            key={`article-page-${page}`}
            size="sm"
            variant={currentPage === page ? "default" : "outline"}
            onClick={() => setCurrentPage(page)}
            className="min-w-10 px-3"
          >
            {page}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="px-3"
        >
          &gt;&gt;
        </Button>
      </div>
    )
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleDelete = (id: number) => {
    setArticles(articles.filter((article) => article.id !== id))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800"
      case "draft":
        return "bg-yellow-100 text-yellow-800"
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const stats = {
    totalArticles: articles.length,
    published: articles.filter((a) => a.status === "published").length,
    totalViews: articles.reduce((sum, a) => sum + a.views, 0),
    totalLikes: articles.reduce((sum, a) => sum + a.likes, 0),
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Articles</h1>
          <p className="text-muted-foreground mt-2">Create and manage blog articles</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto shadow-sm">
          <Plus size={20} />
          New Article
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card className="bg-card shadow-sm">
          <CardContent className="pt-4 pb-4 md:pt-5 md:pb-5">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total Articles</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">{stats.totalArticles}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm">
          <CardContent className="pt-4 pb-4 md:pt-5 md:pb-5">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Published</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600 mt-2">{stats.published}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm">
          <CardContent className="pt-4 pb-4 md:pt-5 md:pb-5">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total Views</p>
              <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-2">{stats.totalViews.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm">
          <CardContent className="pt-4 pb-4 md:pt-5 md:pb-5">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total Likes</p>
              <p className="text-2xl md:text-3xl font-bold text-red-600 mt-2">{stats.totalLikes.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-card shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
              <Input
                placeholder="Search articles or authors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "published", "draft", "scheduled"] as const).map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? "default" : "outline"}
                  onClick={() => setFilterStatus(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Articles */}
      <div className="space-y-3 md:hidden">
        {filteredArticles.length === 0 ? (
          <Card className="bg-card">
            <CardContent className="p-4 text-sm text-muted-foreground">No articles found.</CardContent>
          </Card>
        ) : (
          paginatedArticles.map((article) => (
            <Card key={article.id} className="bg-card shadow-sm">
              <CardContent className="p-3 space-y-3">
                <div>
                  <h3 className="font-medium text-foreground leading-tight">{article.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <User size={14} /> {article.author} • {article.category}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Views</p>
                    <p className="font-medium text-foreground">{article.views.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Likes</p>
                    <p className="font-medium text-foreground">{article.likes.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Read time</p>
                    <p className="font-medium text-foreground">{article.readTime} min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(article.status)}`}>
                      {article.status}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Published</p>
                    <p className="font-medium text-foreground">{new Date(article.publishDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="outline" size="sm">
                    <Eye size={16} className="mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit2 size={16} className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(article.id)}
                  >
                    <Trash2 size={16} className="mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {renderPagination()}
      </div>

      <Card className="bg-card hidden md:block shadow-sm">
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">All Articles</CardTitle>
            <CardDescription>{filteredArticles.length} articles found</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex">
            <Plus size={16} className="mr-2" />
            New Article
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Author</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Views</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Likes</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Read Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Published</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedArticles.map((article) => (
                  <tr key={article.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-3 text-foreground font-medium max-w-xs truncate">{article.title}</td>
                    <td className="py-3 px-3 text-muted-foreground flex items-center gap-2">
                      <User size={16} />
                      {article.author}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">{article.category}</td>
                    <td className="py-3 px-3 text-foreground flex items-center gap-1">
                      <Eye size={16} className="text-blue-500" />
                      {article.views.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-foreground">❤️ {article.likes.toLocaleString()}</td>
                    <td className="py-3 px-3 text-muted-foreground">{article.readTime} min</td>
                    <td className="py-3 px-3 text-muted-foreground flex items-center gap-2">
                      <Calendar size={16} />
                      {new Date(article.publishDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(article.status)}`}
                      >
                        {article.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Eye size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(article.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </CardContent>
      </Card>
    </div>
  )
}
