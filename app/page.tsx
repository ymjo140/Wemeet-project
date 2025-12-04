"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CalendarTab } from "@/components/ui/calendar-tab"
import { ChatTab } from "@/components/ui/chat-tab"
import { CommunityTab } from "@/components/ui/community-tab"
import { HomeTab } from "@/components/ui/home-tab"
import { MyPageTab } from "@/components/ui/mypage-tab"
import { SettingsTab } from "@/components/ui/settings-tab"
import { PreferenceModal } from "@/components/ui/preference-modal"
import { Home, MessageCircle, Users, Calendar, User } from "lucide-react"

export default function WeMeetApp() {
  const [activeTab, setActiveTab] = useState("home")
  const [isLoaded, setIsLoaded] = useState(false)
  const [showPreferenceModal, setShowPreferenceModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
        const token = localStorage.getItem("token")
        if (!token) {
            router.replace("/login")
            return
        }
        
        // 취향 설정 여부 확인
        try {
            const res = await fetch("https://wemeet-backend-xqlo.onrender.com/api/users/me", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const user = await res.json();
                if (!user.preferences || !user.preferences.foods || user.preferences.foods.length === 0) {
                    setShowPreferenceModal(true);
                }
                setIsLoaded(true);
            } else {
                router.replace("/login");
            }
        } catch { setIsLoaded(true); }
    }
    checkAuth();
  }, [router])

  if (!isLoaded) return <div className="h-screen flex items-center justify-center">로딩 중...</div>

  const renderContent = () => {
    switch (activeTab) {
      case "home": return <HomeTab />
      case "chat": return <ChatTab />
      case "community": return <CommunityTab />
      case "calendar": return <CalendarTab />
      case "mypage": return <MyPageTab />
      case "settings": return <SettingsTab />
      default: return <HomeTab />
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 shadow-xl overflow-hidden">
      <PreferenceModal isOpen={showPreferenceModal} onClose={() => setShowPreferenceModal(false)} onSave={() => setShowPreferenceModal(false)} />
      
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
      </main>

      <nav className="flex justify-around items-center p-2 bg-white border-t border-gray-200 pb-safe">
        <button onClick={() => setActiveTab("home")} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === "home" ? "text-primary" : "text-gray-400"}`}><Home className="w-6 h-6" /><span className="text-[10px] mt-1 font-medium">홈</span></button>
        <button onClick={() => setActiveTab("chat")} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === "chat" ? "text-primary" : "text-gray-400"}`}><MessageCircle className="w-6 h-6" /><span className="text-[10px] mt-1 font-medium">채팅</span></button>
        <button onClick={() => setActiveTab("community")} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === "community" ? "text-primary" : "text-gray-400"}`}><Users className="w-6 h-6" /><span className="text-[10px] mt-1 font-medium">커뮤니티</span></button>
        <button onClick={() => setActiveTab("calendar")} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === "calendar" ? "text-primary" : "text-gray-400"}`}><Calendar className="w-6 h-6" /><span className="text-[10px] mt-1 font-medium">일정</span></button>
        <button onClick={() => setActiveTab("mypage")} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === "mypage" ? "text-primary" : "text-gray-400"}`}><User className="w-6 h-6" /><span className="text-[10px] mt-1 font-medium">MY</span></button>
      </nav>
    </div>
  )
}