"use client"

import { useState } from "react"
import { HomeTab } from "@/components/ui/home-tab"
import { MyPageTab } from "@/components/ui/mypage-tab"
import { Map, MessageCircle, Calendar, User } from "lucide-react"

export default function Page() {
  const [activeTab, setActiveTab] = useState("home")

  return (
    <div className="flex h-screen w-full flex-col bg-[#F3F4F6] mx-auto max-w-md shadow-2xl overflow-hidden font-['Pretendard']">
      
      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === "home" && <HomeTab />}
        {activeTab === "chat" && (
            <div className="flex items-center justify-center h-full text-gray-400">채팅 기능 준비 중...</div>
        )}
        {activeTab === "calendar" && (
            <div className="flex items-center justify-center h-full text-gray-400">캘린더 기능 준비 중...</div>
        )}
        {activeTab === "mypage" && <MyPageTab />}
      </main>

      {/* 하단 네비게이션 바 (오타 수정됨) */}
      <nav className="flex h-20 flex-shrink-0 items-center justify-around border-t border-gray-100 bg-white px-2 pb-2 z-30 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
        
        <button 
            onClick={() => setActiveTab("home")} 
            className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 ${
                activeTab === "home" ? "text-[#7C3AED] scale-110" : "text-gray-300 hover:text-gray-400"
            }`}
        >
          <Map className={`w-6 h-6 ${activeTab === "home" ? "fill-[#7C3AED]/20" : ""}`} />
          <span className="text-[10px] font-bold">홈</span>
        </button>

        <button 
            onClick={() => setActiveTab("chat")} 
            className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 ${
                activeTab === "chat" ? "text-[#7C3AED] scale-110" : "text-gray-300 hover:text-gray-400"
            }`}
        >
          <MessageCircle className={`w-6 h-6 ${activeTab === "chat" ? "fill-[#7C3AED]/20" : ""}`} />
          <span className="text-[10px] font-medium">채팅</span>
        </button>

        <button 
            onClick={() => setActiveTab("calendar")} 
            className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 ${
                activeTab === "calendar" ? "text-[#7C3AED] scale-110" : "text-gray-300 hover:text-gray-400"
            }`}
        >
          <Calendar className={`w-6 h-6 ${activeTab === "calendar" ? "fill-[#7C3AED]/20" : ""}`} />
          <span className="text-[10px] font-medium">일정</span>
        </button>

        <button 
            onClick={() => setActiveTab("mypage")} 
            className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 ${
                activeTab === "mypage" ? "text-[#7C3AED] scale-110" : "text-gray-300 hover:text-gray-400"
            }`}
        >
          <User className={`w-6 h-6 ${activeTab === "mypage" ? "fill-[#7C3AED]/20" : ""}`} />
          <span className="text-[10px] font-medium">마이</span>
        </button>

      </nav>
    </div>
  )
}