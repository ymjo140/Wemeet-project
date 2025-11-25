"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Heart, MessageCircle, Share2, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"

const stories = [
  { id: 1, name: "김철수", avatar: "/abstract-geometric-shapes.png", hasStory: true },
  { id: 2, name: "이영희", avatar: "/abstract-geometric-shapes.png", hasStory: true },
  { id: 3, name: "박민수", avatar: "/diverse-group-collaborating.png", hasStory: true },
  { id: 4, name: "최지원", avatar: "/abstract-geometric-shapes.png", hasStory: true },
  { id: 5, name: "정수진", avatar: "/abstract-geometric-shapes.png", hasStory: false },
]

const posts = [
  {
    id: 1,
    user: { name: "김철수", avatar: "/abstract-geometric-shapes.png" },
    image: "/coffee-meet.jpg",
    content: "오늘 친구들과 카페에서 즐거운 시간! ☕",
    likes: 42,
    comments: 8,
    time: "2시간 전",
  },
  {
    id: 2,
    user: { name: "이영희", avatar: "/abstract-geometric-shapes.png" },
    image: "/park-meeting.jpg",
    content: "주말 소풍 최고였어요! 🌳",
    likes: 87,
    comments: 15,
    time: "5시간 전",
  },
]

export function FriendsTab() {
  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <h1 className="text-2xl font-bold">친구</h1>
      </div>

      {/* Stories */}
      <div className="px-4">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {stories.map((story) => (
            <button key={story.id} className="flex flex-col items-center gap-2 flex-shrink-0">
              <div
                className={`relative ${
                  story.hasStory ? "p-[2px] bg-gradient-to-tr from-primary via-accent to-chart-4 rounded-full" : ""
                }`}
              >
                <Avatar className="w-16 h-16 border-2 border-background">
                  <AvatarImage src={story.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{story.name[0]}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs text-muted-foreground max-w-[64px] truncate">{story.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="overflow-hidden border-0 shadow-sm">
            {/* Post Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={post.user.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{post.user.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{post.user.name}</p>
                  <p className="text-xs text-muted-foreground">{post.time}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>

            {/* Post Image */}
            <img src={post.image || "/placeholder.svg"} alt="Post" className="w-full aspect-square object-cover" />

            {/* Post Actions */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="gap-2 px-2">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm">{post.likes}</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 px-2">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{post.comments}</span>
                </Button>
                <Button variant="ghost" size="icon" className="ml-auto">
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>

              {/* Post Content */}
              <div className="text-sm">
                <span className="font-semibold">{post.user.name}</span> <span>{post.content}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
