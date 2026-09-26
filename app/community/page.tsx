import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageCircle, Users, Search, Flame, Clock, UserPlus } from 'lucide-react'

// Mock discussion data
const discussions = [
  {
    id: 1,
    title: 'How do you build presentation confidence fast?',
    author: 'Marta Bekele',
    authorImage: 'https://i.pravatar.cc/150?img=3',
    category: 'Speaking',
    replies: 24,
    views: 356,
    lastActive: '2023-12-12T08:23:15',
    pinned: true,
  },
  {
    id: 2,
    title: 'Best daily practice routines for busy schedules',
    author: 'Sara Mohammed',
    authorImage: 'https://i.pravatar.cc/150?img=5',
    category: 'Study Tips',
    replies: 18,
    views: 245,
    lastActive: '2023-12-15T14:45:30',
  },
  {
    id: 3,
    title: 'How I improved my public speaking in 30 days',
    author: 'Daniel Haile',
    authorImage: 'https://i.pravatar.cc/150?img=12',
    category: 'Communication Skills',
    replies: 32,
    views: 512,
    lastActive: '2023-12-18T09:12:45',
    hot: true,
  },
  {
    id: 4,
    title: 'Customer service and sales communication',
    author: 'Hiwot Tadesse',
    authorImage: 'https://i.pravatar.cc/150?img=23',
    category: 'Workplace Communication',
    replies: 29,
    views: 378,
    lastActive: '2023-12-16T21:30:10',
  },
  {
    id: 5,
    title: 'Best resources for certification prep',
    author: 'Yonas Girmay',
    authorImage: 'https://i.pravatar.cc/150?img=42',
    category: 'Certifications',
    replies: 15,
    views: 198,
    lastActive: '2023-12-17T11:05:22',
  },
  {
    id: 6,
    title: 'Looking for a weekly speaking partner',
    author: 'Meron Hailu',
    authorImage: 'https://i.pravatar.cc/150?img=32',
    category: 'Community',
    replies: 21,
    views: 267,
    lastActive: '2023-12-14T16:18:35',
  },
]

// Mock categories
const categories = [
  { name: 'Speaking', count: 156 },
  { name: 'Study Tips', count: 89 },
  { name: 'Communication Skills', count: 43 },
  { name: 'Workplace Communication', count: 72 },
  { name: 'Certifications', count: 38 },
  { name: 'Community', count: 64 },
]

// Format date helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export default function CommunityPage() {
  return (
    <div className="container p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-montserrat mb-2">Neway Learn Community</h1>
        <p className="text-muted-foreground">Connect with fellow learners, mentors, and study partners</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full lg:w-1/4">
          <div className="sticky top-24 space-y-6">
            <Button className="w-full" asChild>
              <Link href="/community/new-topic">
                <MessageCircle className="mr-2 h-4 w-4" />
                Create new topic
              </Link>
            </Button>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search discussions" className="pl-10" />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-1">
                  {categories.map((category) => (
                    <Button
                      key={category.name}
                      variant="ghost"
                      className="w-full justify-between font-normal"
                      size="sm"
                    >
                      {category.name}
                      <Badge variant="secondary" className="ml-auto">
                        {category.count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Community stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">5.2k</p>
                    <p className="text-sm text-muted-foreground">Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">862</p>
                    <p className="text-sm text-muted-foreground">Topics</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">12.4k</p>
                    <p className="text-sm text-muted-foreground">Replies</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">48</p>
                    <p className="text-sm text-muted-foreground">Online</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main content */}
        <div className="w-full lg:w-3/4">
          <Tabs defaultValue="latest" className="w-full mb-6">
            <TabsList>
              <TabsTrigger value="latest">Latest</TabsTrigger>
              <TabsTrigger value="trending">Trending</TabsTrigger>
              <TabsTrigger value="unanswered">Unanswered</TabsTrigger>
              <TabsTrigger value="my-topics">My Topics</TabsTrigger>
            </TabsList>

            <TabsContent value="latest" className="mt-6">
              <div className="space-y-4">
                {discussions.map((discussion) => (
                  <DiscussionCard key={discussion.id} discussion={discussion} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="trending" className="mt-6">
              <div className="space-y-4">
                {discussions
                  .sort((a, b) => b.views - a.views)
                  .map((discussion) => (
                    <DiscussionCard key={discussion.id} discussion={discussion} />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="unanswered" className="mt-6">
              <div className="space-y-4">
                {discussions
                  .filter(d => d.replies < 5)
                  .map((discussion) => (
                    <DiscussionCard key={discussion.id} discussion={discussion} />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="my-topics" className="mt-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Please sign in to view your topics</p>
                <Button asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

interface DiscussionCardProps {
  discussion: {
    id: number
    title: string
    author: string
    authorImage: string
    category: string
    replies: number
    views: number
    lastActive: string
    pinned?: boolean
    hot?: boolean
  }
}

function DiscussionCard({ discussion }: DiscussionCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="hidden md:block">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img
                src={discussion.authorImage}
                alt={discussion.author}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  href={`/community/discussion/${discussion.id}`}
                  className="text-lg font-semibold hover:text-primary transition-colors line-clamp-1"
                >
                  {discussion.title}
                </Link>

                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="outline">{discussion.category}</Badge>

                  {discussion.pinned && (
                    <Badge variant="secondary">Pinned</Badge>
                  )}

                  {discussion.hot && (
                    <Badge className="bg-orange-500">
                      <Flame className="mr-1 h-3 w-3" />
                      Hot
                    </Badge>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm text-muted-foreground">
                  {formatDate(discussion.lastActive)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center mt-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <div className="md:hidden mr-2">
                  <div className="w-5 h-5 rounded-full overflow-hidden">
                    <img
                      src={discussion.authorImage}
                      alt={discussion.author}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <span>Started by {discussion.author}</span>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <MessageCircle className="mr-1 h-4 w-4" />
                  <span>{discussion.replies} replies</span>
                </div>

                <div className="flex items-center">
                  <Users className="mr-1 h-4 w-4" />
                  <span>{discussion.views} views</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}