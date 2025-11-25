"use client"

import { useState } from "react"
import { HomeTab } from "@/components/home-tab"
import { ChatTab } from "@/components/chat-tab"
import { CommunityTab } from "@/components/community-tab"
import { CalendarTab } from "@/components/calendar-tab"
import { MyPageTab } from "@/components/mypage-tab"
import { Home, MessageCircle, Users, Calendar, User } from "lucide-react"

type Tab = "home" | "chat" | "community" | "calendar" | "mypage"

export default function WeMeetApp() {
  const [activeTab, setActiveTab] = useState<Tab>("home")

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-background">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === "home" && <HomeTab />}
        {activeTab === "chat" && <ChatTab />}
        {activeTab === "community" && <CommunityTab />}
        {activeTab === "calendar" && <CalendarTab />}
        {activeTab === "mypage" && <MyPageTab />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card border-t border-border">
        <div className="flex items-center justify-around h-16 px-2">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === "home" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">홈</span>
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === "chat" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-medium">채팅</span>
          </button>

          <button
            onClick={() => setActiveTab("community")}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === "community" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs font-medium">커뮤니티</span>
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === "calendar" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs font-medium">캘린더</span>
          </button>

          <button
            onClick={() => setActiveTab("mypage")}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === "mypage" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">마이</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
