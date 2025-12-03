"use client"

import React, { useState, useEffect } from "react"
import { Plus, Users, MapPin, Calendar, Star, Search, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface Community {
  id: string;
  host_id: number;
  title: string;
  category: string;
  location: string;
  date_time: string;
  max_members: number;
  description: string;
  tags: string[];
  rating: number;
  current_members: { id: number; name: string }[];
}

const CATEGORIES = [
  { id: "meal", label: "🍚 식사" },
  { id: "hobby", label: "🎨 취미/여가" },
  { id: "alcohol", label: "🍺 술/친목" },
  { id: "study", label: "📚 스터디" },
  { id: "exercise", label: "⚽ 운동" },
]

export function CommunityTab() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null)
  const [myId, setMyId] = useState<number>(0)

  const [newForm, setNewForm] = useState({
      title: "", category: "meal", location: "", date_time: "", max_members: 4, description: "", tags: ""
  })

  useEffect(() => {
      const token = localStorage.getItem("token");
      const storedId = localStorage.getItem("userId");
      if (storedId) setMyId(parseInt(storedId));
      if (token) fetchCommunities();
  }, [])

  const fetchCommunities = async () => {
      try {
          const res = await fetch("http://127.0.0.1:8000/api/communities", {
              headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
          });
          if (res.ok) setCommunities(await res.json());
      } catch (e) { console.error(e); }
  }

  const handleCreate = async () => {
      const token = localStorage.getItem("token");
      try {
          const res = await fetch("http://127.0.0.1:8000/api/communities", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify({
                  ...newForm,
                  tags: newForm.tags.split(",").map(t => t.trim()),
                  host_id: myId
              })
          });
          if (res.ok) {
              alert("모임이 개설되었습니다!");
              setIsCreateOpen(false);
              fetchCommunities();
          }
      } catch (e) { alert("생성 실패"); }
  }

  // [핵심] 가입 후 목록 갱신
  const handleJoin = async (communityId: string) => {
      const token = localStorage.getItem("token");
      if (!token) return alert("로그인이 필요합니다.");

      try {
          const res = await fetch(`http://127.0.0.1:8000/api/communities/${communityId}/join`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${token}` }
          });
          
          if (res.ok) {
              alert("참여 완료! 채팅방이 생성됩니다.");
              setSelectedCommunity(null);
              fetchCommunities(); // 즉시 갱신
          } else {
              const err = await res.json();
              alert(err.detail || "참여 실패");
          }
      } catch (e) { alert("오류 발생"); }
  }

  const isJoined = (comm: Community) => {
      return comm.current_members.some(m => m.id === myId);
  }

  return (
    <div className="h-full bg-slate-50 flex flex-col">
      <div className="bg-white p-4 border-b sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div>
            <h1 className="text-xl font-bold">커뮤니티</h1>
            <p className="text-xs text-gray-500">취향이 맞는 동네 친구 찾기</p>
        </div>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1"/> 모임 개설
        </Button>
      </div>

      <div className="bg-white px-4 pb-3 border-b flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => (
              <Badge key={cat.id} variant="outline" className="px-3 py-1.5 text-sm cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                  {cat.label}
              </Badge>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {communities.map(comm => (
            <Card key={comm.id} className="cursor-pointer hover:border-indigo-300 transition-all active:scale-[0.98]" onClick={() => setSelectedCommunity(comm)}>
                <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <Badge variant={comm.category === 'meal' ? "default" : "secondary"}>
                            {CATEGORIES.find(c => c.id === comm.category)?.label || comm.category}
                        </Badge>
                        <span className="text-xs text-gray-400">
                            {comm.current_members.length} / {comm.max_members}명
                        </span>
                    </div>
                    <h3 className="font-bold text-lg mb-1">{comm.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <MapPin className="w-3 h-3"/> {comm.location}
                        <span className="w-px h-2 bg-gray-300"/>
                        <Calendar className="w-3 h-3"/> {comm.date_time}
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                            {comm.current_members.slice(0, 4).map((m, i) => (
                                <Avatar key={i} className="w-6 h-6 border-2 border-white">
                                    <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-600">{m.name[0]}</AvatarFallback>
                                </Avatar>
                            ))}
                            {comm.current_members.length > 4 && (
                                <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[8px] text-gray-500">+{comm.current_members.length - 4}</div>
                            )}
                        </div>
                        {isJoined(comm) ? (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">참여중</Badge>
                        ) : (
                            <span className="text-xs text-indigo-600 font-bold">자세히 보기 &gt;</span>
                        )}
                    </div>
                </CardContent>
            </Card>
        ))}
        {communities.length === 0 && (
            <div className="text-center py-20 text-gray-400">
                <p>아직 등록된 모임이 없어요 😢</p>
                <p className="text-xs mt-1">첫 번째 모임을 만들어보세요!</p>
            </div>
        )}
      </div>

      <Dialog open={!!selectedCommunity} onOpenChange={() => setSelectedCommunity(null)}>
          <DialogContent className="sm:max-w-sm rounded-xl">
              <DialogHeader>
                  <DialogTitle>{selectedCommunity?.title}</DialogTitle>
                  <DialogDescription>
                      호스트의 매너 온도: <span className="text-orange-500 font-bold">{selectedCommunity?.rating}℃</span>
                  </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-2">
                  <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-2">
                      <div className="flex gap-2"><Calendar className="w-4 h-4 text-gray-400"/> {selectedCommunity?.date_time}</div>
                      <div className="flex gap-2"><MapPin className="w-4 h-4 text-gray-400"/> {selectedCommunity?.location}</div>
                      <div className="flex gap-2"><Users className="w-4 h-4 text-gray-400"/> {selectedCommunity?.current_members.length} / {selectedCommunity?.max_members}명 참여 중</div>
                  </div>
                  
                  <div className="text-sm text-gray-700 leading-relaxed">
                      {selectedCommunity?.description}
                  </div>

                  <div className="flex flex-wrap gap-2">
                      {selectedCommunity?.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs text-gray-500">#{tag}</Badge>
                      ))}
                  </div>
              </div>

              <DialogFooter>
                  {selectedCommunity && isJoined(selectedCommunity) ? (
                      <Button className="w-full bg-green-600 hover:bg-green-700" disabled>이미 참여했습니다</Button>
                  ) : (
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => selectedCommunity && handleJoin(selectedCommunity.id)}>
                          참여하고 같이 놀기
                      </Button>
                  )}
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-sm rounded-xl">
            <DialogHeader><DialogTitle>새 모임 만들기</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
                <Input placeholder="모임 제목 (예: 강남역 맛집 탐방)" value={newForm.title} onChange={e => setNewForm({...newForm, title: e.target.value})} />
                
                <div className="grid grid-cols-2 gap-2">
                    <Select value={newForm.category} onValueChange={v => setNewForm({...newForm, category: v})}>
                        <SelectTrigger><SelectValue placeholder="카테고리" /></SelectTrigger>
                        <SelectContent>
                            {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Input type="number" placeholder="최대 인원" value={newForm.max_members} onChange={e => setNewForm({...newForm, max_members: parseInt(e.target.value)})} />
                </div>

                <Input placeholder="장소 (예: 강남역 11번 출구)" value={newForm.location} onChange={e => setNewForm({...newForm, location: e.target.value})} />
                <Input type="datetime-local" onChange={e => setNewForm({...newForm, date_time: e.target.value.replace('T', ' ')})} />
                
                <Textarea placeholder="어떤 모임인지 설명해주세요!" value={newForm.description} onChange={e => setNewForm({...newForm, description: e.target.value})} />
                <Input placeholder="태그 (쉼표로 구분)" value={newForm.tags} onChange={e => setNewForm({...newForm, tags: e.target.value})} />
                
                <Button className="w-full bg-indigo-600" onClick={handleCreate}>개설하기</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}