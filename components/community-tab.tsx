"use client"

import React, { useState, useEffect, useRef } from "react"
import { Plus, Users, MapPin, Calendar, Star, Search, X, ArrowLeft, Send, MessageCircle, Sparkles, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// --- 타입 정의 ---
interface Member { id: number; name: string; avatar: string; manner: number; }
interface Community {
  id: string; host_id: number; title: string; category: string;
  location: string; date_time: string; max_members: number;
  current_members: Member[]; description: string; tags: string[]; rating: number;
}
interface ChatMessage { user_id: number; name: string; avatar: string; content: string; timestamp: string; isMe?: boolean; type?: "text"|"recommendation"|"system"; data?: any; }
interface ParsedSchedule { title: string; date: string; time: string; location_name: string; purpose: string; }

const MY_ID = 1; 
const CATEGORIES = [
  { value: "meal", label: "🍚 식사" }, { value: "cafe", label: "☕ 카페" },
  { value: "drinking", label: "🍺 술/회식" }, { value: "business", label: "👔 비즈니스" },
  { value: "study", label: "📚 스터디" }, { value: "date", label: "💖 데이트/친목" },
]

export function CommunityTab() {
  const [view, setView] = useState<'LIST' | 'CHAT'>('LIST');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [otherCommunities, setOtherCommunities] = useState<Community[]>([]);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [activeChatRoom, setActiveChatRoom] = useState<Community | null>(null);

  // 채팅 & AI 상태
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"none" | "schedule">("none");
  const [parsedSchedule, setParsedSchedule] = useState<ParsedSchedule | null>(null);

  const fetchCommunities = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/communities');
      if (res.ok) {
        const allData: Community[] = await res.json();
        setMyCommunities(allData.filter(c => c.current_members.some(m => m.id === MY_ID)));
        setOtherCommunities(allData.filter(c => !c.current_members.some(m => m.id === MY_ID)));
        setCommunities(allData);
      }
    } catch (e) { console.error(e); }
  }

  useEffect(() => { fetchCommunities() }, []);

  const [newForm, setNewForm] = useState({ title: "", category: "meal", location: "", date_time: "", max_members: 4, description: "", tags: "" });
  
  const handleCreate = async () => {
    if (!newForm.title) return alert("제목 입력 필수");
    try {
        const res = await fetch('http://127.0.0.1:8000/api/communities', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newForm, host_id: MY_ID, tags: newForm.tags.split(',').map(t => t.trim()).filter(t => t) })
        });
        if (res.ok) {
            alert("모임 개설 완료!");
            setIsCreateOpen(false);
            fetchCommunities();
        }
    } catch (e) { alert("실패"); }
  }

  const handleJoin = async () => {
      if (!selectedCommunity) return;
      if (confirm("참여하시겠습니까?")) {
          try {
              const res = await fetch(`http://127.0.0.1:8000/api/communities/${selectedCommunity.id}/join`, { method: 'POST' });
              if (res.ok) {
                  alert("참여 완료!");
                  setSelectedCommunity(null);
                  fetchCommunities();
                  enterChatRoom(selectedCommunity);
              } else alert("참여 실패");
          } catch (e) { alert("오류"); }
      }
  }

  const enterChatRoom = (community: Community) => {
      setActiveChatRoom(community);
      setView('CHAT');
      setMessages([]);
      
      const ws = new WebSocket(`ws://127.0.0.1:8000/ws/${community.id}/${MY_ID}`);
      ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          setMessages(prev => [...prev, { ...msg, isMe: msg.user_id === MY_ID, type: "text" }]);
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      };
      socketRef.current = ws;
  };

  const leaveChatRoom = () => {
      socketRef.current?.close();
      setView('LIST');
      setActiveChatRoom(null);
  };

  const sendMessage = async () => {
      if (!inputText.trim()) return;

      if (aiMode === "schedule") {
          try {
              const res = await fetch('http://127.0.0.1:8000/api/ai/parse-schedule', {
                  method: 'POST', headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ text: inputText })
              });
              if (res.ok) setParsedSchedule(await res.json());
          } catch (e) { alert("AI 분석 실패"); }
          setInputText("");
          setAiMode("none");
          return;
      }

      if (socketRef.current) {
          socketRef.current.send(JSON.stringify({ content: inputText }));
      } else {
          // 소켓 연결 전이면 로컬 추가 (테스트용)
           setMessages(prev => [...prev, { user_id: MY_ID, name: "나", avatar: "👤", content: inputText, timestamp: "Now", isMe: true, type: "text" }]);
      }
      setInputText("");
  };

  const confirmSchedule = async () => {
      if (!parsedSchedule) return;
      try {
          await fetch('http://127.0.0.1:8000/api/events', {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ ...parsedSchedule, user_id: MY_ID })
          });
          alert("일정 등록 완료!");
          setParsedSchedule(null);
          setMessages(prev => [...prev, { user_id: 0, name: "WeMeet AI", avatar: "🤖", content: `📅 일정 등록됨: ${parsedSchedule.title}`, timestamp: "Now", type: "system", isMe: false }]);
      } catch (e) { alert("등록 실패"); }
  };

  const triggerAiRecommend = async () => {
      setIsAiMenuOpen(false);
      setMessages(prev => [...prev, { user_id: 0, name: "WeMeet AI", avatar: "🤖", content: "주변 맛집 찾는 중...", timestamp: "Now", type: "system", isMe: false }]);

      if (!activeChatRoom) return;
      try {
          const res = await fetch('http://127.0.0.1:8000/api/recommend', {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                  users: [{id:1, name:"나"}], purpose: activeChatRoom.category, 
                  location_name: activeChatRoom.location,
                  current_lat: 37.551, current_lng: 127.011, user_selected_tags: []
              })
          });
          if (res.ok) {
              const places = await res.json();
              setMessages(prev => [...prev, { user_id: 0, name: "WeMeet AI", avatar: "🤖", content: "추천 장소", timestamp: "Now", type: "recommendation", data: places.slice(0, 3) }]);
              setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          }
      } catch (e) { console.error(e); }
  };

  if (view === 'CHAT' && activeChatRoom) {
      return (
        <div className="h-full flex flex-col bg-[#b2c7d9]">
            <div className="bg-white p-3 border-b flex items-center gap-3 sticky top-0 z-10 shadow-sm">
                <Button variant="ghost" size="icon" onClick={leaveChatRoom}><ArrowLeft className="w-6 h-6"/></Button>
                <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-lg truncate">{activeChatRoom.title}</h2>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3"/> {activeChatRoom.current_members.length}명</p>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex justify-center"><span className="bg-black/10 text-gray-600 text-xs px-3 py-1 rounded-full">채팅방에 입장했습니다.</span></div>
                {messages.map((msg, idx) => {
                    if (msg.type === 'recommendation') {
                        return (
                            <div key={idx} className="flex flex-col gap-2 my-2">
                                <div className="flex items-center gap-2 text-xs text-gray-500 justify-center"><Sparkles className="w-3 h-3"/> AI 추천</div>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {msg.data.map((p: any) => (
                                        <Card key={p.id} className="min-w-[200px] p-3 bg-white shadow-md">
                                            <div className="h-20 bg-gray-100 rounded-md mb-2 flex items-center justify-center text-2xl">{p.category === 'cafe' ? '☕' : '🍽️'}</div>
                                            <h4 className="font-bold text-sm truncate">{p.name}</h4>
                                            <p className="text-xs text-gray-500">{p.category} · {p.score ? p.score.toFixed(0) : 90}%</p>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )
                    }
                    return (
                        <div key={idx} className={`flex gap-2 ${msg.isMe ? "flex-row-reverse" : "flex-row"}`}>
                            {!msg.isMe && <Avatar className="w-8 h-8 mt-1"><AvatarFallback>{msg.name[0]}</AvatarFallback></Avatar>}
                            <div className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"} max-w-[80%]`}>
                                {!msg.isMe && <span className="text-xs text-gray-600 mb-1 ml-1">{msg.name}</span>}
                                <div className={`px-3 py-2 rounded-lg text-sm shadow-sm break-words ${msg.isMe ? "bg-yellow-400 text-black rounded-tr-none" : "bg-white text-black rounded-tl-none"}`}>{msg.content}</div>
                                <span className="text-[10px] text-gray-500 mt-1 px-1">{msg.timestamp}</span>
                            </div>
                        </div>
                    )
                })}
                <div ref={scrollRef} />
            </div>
            <div className="p-3 bg-white border-t flex gap-2 sticky bottom-0 items-center">
                <Popover open={isAiMenuOpen} onOpenChange={setIsAiMenuOpen}>
                    <PopoverTrigger asChild><Button size="icon" className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full w-10 h-10 flex-shrink-0"><span className="font-bold text-xs">WM</span></Button></PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start" side="top">
                        <div className="flex flex-col gap-1">
                            <Button variant="ghost" className="justify-start h-9 text-sm" onClick={triggerAiRecommend}><MapPin className="w-4 h-4 mr-2 text-blue-500"/> 장소 추천</Button>
                            <Button variant="ghost" className="justify-start h-9 text-sm" onClick={() => { setAiMode("schedule"); setIsAiMenuOpen(false); }}><Calendar className="w-4 h-4 mr-2 text-green-500"/> 일정 등록 (자연어)</Button>
                        </div>
                    </PopoverContent>
                </Popover>
                <Input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={aiMode === "schedule" ? "예: 내일 7시 홍대 회식" : "메시지..."} className={`flex-1 border-none focus-visible:ring-0 ${aiMode === "schedule" ? "bg-green-50 ring-2 ring-green-500 placeholder:text-green-700" : "bg-gray-100"}`}/>
                <Button onClick={sendMessage} size="icon" className={aiMode === "schedule" ? "bg-green-600" : "bg-yellow-400 text-black"}>{aiMode === "schedule" ? <Check className="w-5 h-5"/> : <Send className="w-5 h-5"/>}</Button>
            </div>
            <Dialog open={!!parsedSchedule} onOpenChange={() => setParsedSchedule(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>일정 등록 확인</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-2 text-sm">
                        <div className="flex gap-2"><span className="font-bold w-12">제목:</span> {parsedSchedule?.title}</div>
                        <div className="flex gap-2"><span className="font-bold w-12">일시:</span> {parsedSchedule?.date} {parsedSchedule?.time}</div>
                        <div className="flex gap-2"><span className="font-bold w-12">장소:</span> {parsedSchedule?.location_name}</div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setParsedSchedule(null)}>취소</Button><Button onClick={confirmSchedule}>등록</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="sticky top-0 z-10 bg-white border-b p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">커뮤니티</h1>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="bg-primary text-white"><Plus className="w-4 h-4 mr-1"/> 모임 개설</Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {myCommunities.length > 0 && (
            <section>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-blue-600"><MessageCircle className="w-5 h-5"/> 참여 중인 모임</h2>
                <div className="space-y-3">
                    {myCommunities.map(item => (
                        <Card key={item.id} onClick={() => enterChatRoom(item)} className="cursor-pointer border-l-4 border-l-blue-500 hover:bg-blue-50 transition-colors shadow-sm">
                            <CardContent className="p-4 flex justify-between items-center">
                                <div><h3 className="font-bold text-base mb-1">{item.title}</h3><div className="text-xs text-gray-500">📍 {item.location} · 📅 {item.date_time.split(' ')[0]}</div></div>
                                <Badge variant="secondary">{item.current_members.length}명</Badge>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        )}
        <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-800"><Search className="w-5 h-5"/> 새로운 모임 찾기</h2>
            <div className="space-y-3">
                {otherCommunities.map(item => (
                    <Card key={item.id} onClick={() => setSelectedCommunity(item)} className="cursor-pointer hover:border-primary transition-all shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start"><Badge variant="outline" className="mb-2">{CATEGORIES.find(c => c.value === item.category)?.label}</Badge><span className="text-xs text-muted-foreground flex items-center"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1"/>{item.rating}</span></div>
                            <CardTitle className="text-base">{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-2"><MapPin className="w-3 h-3"/> {item.location}</div>
                            <div className="flex items-center gap-2"><Calendar className="w-3 h-3"/> {item.date_time}</div>
                            <div className="flex items-center gap-2 text-xs mt-2">
                                {item.current_members.slice(0, 3).map(m => <Avatar key={m.id} className="w-5 h-5 border"><AvatarFallback>{m.avatar}</AvatarFallback></Avatar>)}
                                <span className="ml-auto">{item.current_members.length}/{item.max_members}명</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {otherCommunities.length === 0 && <div className="text-center py-8 text-gray-400">새로운 모임이 없습니다.</div>}
            </div>
        </section>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>새 모임 만들기</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
                <Input placeholder="모임 제목" value={newForm.title} onChange={e => setNewForm({...newForm, title: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                    <Select onValueChange={(v) => setNewForm({...newForm, category: v})} defaultValue="meal"><SelectTrigger><SelectValue placeholder="카테고리" /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>
                    <Input type="number" placeholder="인원" value={newForm.max_members} onChange={e => setNewForm({...newForm, max_members: parseInt(e.target.value)})} />
                </div>
                <Input placeholder="장소" value={newForm.location} onChange={e => setNewForm({...newForm, location: e.target.value})} />
                <Input type="datetime-local" onChange={e => setNewForm({...newForm, date_time: e.target.value.replace('T', ' ')})} />
                <Textarea placeholder="설명" value={newForm.description} onChange={e => setNewForm({...newForm, description: e.target.value})} />
                <Input placeholder="태그 (쉼표 구분)" value={newForm.tags} onChange={e => setNewForm({...newForm, tags: e.target.value})} />
                <Button className="w-full" onClick={handleCreate}>개설하기</Button>
            </div>
        </DialogContent>
      </Dialog>

      {selectedCommunity && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 p-0">
              <div className="bg-white w-full max-w-md sm:rounded-xl rounded-t-xl animate-in slide-in-from-bottom-10 p-5 space-y-5">
                  <div className="flex justify-between"><h2 className="text-xl font-bold">{selectedCommunity.title}</h2><Button variant="ghost" size="icon" onClick={() => setSelectedCommunity(null)}><X className="w-6 h-6"/></Button></div>
                  <div className="space-y-2 text-sm"><p>📅 {selectedCommunity.date_time}</p><p>📍 {selectedCommunity.location}</p><p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedCommunity.description}</p></div>
                  <Button className="w-full h-12 text-lg font-bold gap-2" onClick={handleJoin}><MessageCircle className="w-5 h-5"/> 참여하고 채팅하기</Button>
              </div>
          </div>
      )}
    </div>
  )
}