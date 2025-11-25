"use client"

import { useState, useEffect, useRef } from "react"
import { Send, ArrowLeft, Sparkles, MapPin, Calendar, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

// --- 타입 정의 ---
interface ChatRoom { id: number; name: string; lastMessage: string; time: string; unread: number; isGroup: boolean; }
interface ChatMessage { 
    user_id: number; name: string; avatar: string; content: string; timestamp: string; 
    isMe?: boolean; type?: "text" | "recommendation" | "system"; data?: any; 
}

const MY_ID = 1; 

export function ChatTab() {
  const [view, setView] = useState<'LIST' | 'ROOM'>('LIST');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // AI 관련 상태
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"none" | "schedule">("none");
  const [parsedSchedule, setParsedSchedule] = useState<any>(null);

  // 1. 채팅방 목록 불러오기
  const fetchRooms = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/chat/rooms');
      if (res.ok) setRooms(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (view === 'LIST') {
      fetchRooms();
      const interval = setInterval(fetchRooms, 3000);
      return () => clearInterval(interval);
    }
  }, [view]);

  // 2. 채팅방 입장
  const enterRoom = (room: ChatRoom) => {
    setCurrentRoom(room); setView('ROOM'); setMessages([]);
    // 히스토리 로드 (생략 가능)
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/${room.id}/${MY_ID}`);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setMessages(prev => [...prev, { ...msg, isMe: msg.user_id === MY_ID, type: "text" }]);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };
    socketRef.current = ws;
  };

  const leaveRoom = () => { socketRef.current?.close(); setView('LIST'); setCurrentRoom(null); };

  // 3. 메시지 전송 (AI 모드 분기)
  const handleSend = async () => {
    if (!inputText.trim()) return;

    // [A] 일반 채팅 전송
    if (aiMode === "none") {
        socketRef.current?.send(JSON.stringify({ content: inputText }));
        setInputText("");
        return;
    }

    // [B] AI 일정 등록 모드
    if (aiMode === "schedule") {
        try {
            // 자연어 파싱 요청
            const res = await fetch('http://127.0.0.1:8000/api/ai/parse-schedule', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ text: inputText })
            });
            if (res.ok) {
                const data = await res.json();
                setParsedSchedule(data); // 확인 모달 띄우기
            }
        } catch (e) { alert("AI 분석 실패"); }
        setInputText("");
        setAiMode("none");
    }
  };

  // 4. AI 기능: 장소 추천 호출
  const triggerAiRecommend = async () => {
      setIsAiMenuOpen(false);
      // 시스템 메시지 추가
      setMessages(prev => [...prev, { 
          user_id: 0, name: "WeMeet AI", avatar: "🤖", 
          content: "우리 모임에 딱 맞는 장소를 찾고 있어요...", timestamp: "Now", type: "system" 
      }]);

      try {
          // 추천 API 호출 (현재 위치/목적 등은 임시값 사용)
          const res = await fetch('http://127.0.0.1:8000/api/recommend', {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                  users: [{id:1, name:"나"}], purpose: "meal", location_name: "약수",
                  current_lat: 37.551, current_lng: 127.011, user_selected_tags: []
              })
          });
          
          if (res.ok) {
              const places = await res.json();
              // 추천 결과를 채팅창에 특수 메시지로 추가
              setMessages(prev => [...prev, { 
                  user_id: 0, name: "WeMeet AI", avatar: "🤖", 
                  content: "추천 장소", timestamp: "Now", type: "recommendation", data: places.slice(0, 3)
              }]);
          }
      } catch (e) { console.error(e); }
  };

  // 5. 일정 등록 확정
  const confirmSchedule = async () => {
      if (!parsedSchedule) return;
      try {
          await fetch('http://127.0.0.1:8000/api/events', {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ ...parsedSchedule, user_id: MY_ID })
          });
          alert("캘린더에 일정이 등록되었습니다!");
          setParsedSchedule(null);
      } catch (e) { alert("등록 실패"); }
  };


  // --- UI ---
  if (view === 'LIST') {
      return (
        <div className="h-full flex flex-col bg-slate-50">
           <div className="p-4 bg-white border-b"><h1 className="text-2xl font-bold">채팅</h1></div>
           <div className="p-4 space-y-3">
               {rooms.map(room => (
                   <button key={room.id} onClick={() => enterRoom(room)} className="w-full bg-white p-4 rounded-xl border flex gap-4 items-center hover:bg-gray-50">
                       <Avatar><AvatarFallback>{room.name[0]}</AvatarFallback></Avatar>
                       <div className="text-left flex-1"><h3 className="font-bold truncate">{room.name}</h3><p className="text-sm text-gray-500">{room.lastMessage}</p></div>
                   </button>
               ))}
           </div>
        </div>
      )
  }

  return (
    <div className="h-full flex flex-col bg-[#b2c7d9]">
      {/* 헤더 */}
      <div className="bg-white/90 backdrop-blur p-3 border-b flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Button variant="ghost" size="icon" onClick={leaveRoom}><ArrowLeft className="w-6 h-6"/></Button>
        <h2 className="font-bold text-lg truncate flex-1">{currentRoom?.name}</h2>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
            if (msg.type === 'recommendation') {
                return (
                    <div key={idx} className="flex flex-col gap-2 my-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500 justify-center"><Sparkles className="w-3 h-3"/> AI 추천 결과</div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {msg.data.map((p: any) => (
                                <Card key={p.id} className="min-w-[200px] p-3 bg-white shadow-md">
                                    <div className="h-20 bg-gray-100 rounded-md mb-2 flex items-center justify-center text-2xl">🍽️</div>
                                    <h4 className="font-bold text-sm truncate">{p.name}</h4>
                                    <p className="text-xs text-gray-500">{p.category} · {(p.score).toFixed(0)}%</p>
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
                        <div className={`px-3 py-2 rounded-lg text-sm shadow-sm break-words ${msg.isMe ? "bg-yellow-400 text-black" : "bg-white text-black"}`}>
                            {msg.content}
                        </div>
                    </div>
                </div>
            )
        })}
        <div ref={scrollRef} />
    </div>

      {/* 입력창 */}
      <div className="p-3 bg-white border-t flex gap-2 sticky bottom-0 items-center">
        {/* WM 버튼 (AI Trigger) */}
        <Popover open={isAiMenuOpen} onOpenChange={setIsAiMenuOpen}>
            <PopoverTrigger asChild>
                <Button size="icon" className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:opacity-90 rounded-full shadow-lg w-10 h-10 flex-shrink-0">
                    <span className="font-bold text-xs">WM</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start" side="top">
                <div className="flex flex-col gap-1">
                    <Button variant="ghost" className="justify-start h-9 text-sm" onClick={triggerAiRecommend}>
                        <MapPin className="w-4 h-4 mr-2 text-blue-500"/> 장소 추천 받기
                    </Button>
                    <Button variant="ghost" className="justify-start h-9 text-sm" onClick={() => { setAiMode("schedule"); setIsAiMenuOpen(false); }}>
                        <Calendar className="w-4 h-4 mr-2 text-green-500"/> 일정 등록 (자연어)
                    </Button>
                </div>
            </PopoverContent>
        </Popover>

        <Input 
          value={inputText} 
          onChange={e => setInputText(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={aiMode === "schedule" ? "예: 내일 저녁 7시 강남역 회식" : "메시지를 입력하세요..."} 
          className={`flex-1 border-none focus-visible:ring-0 ${aiMode === "schedule" ? "bg-green-50 ring-2 ring-green-500 placeholder:text-green-700" : "bg-gray-100"}`}
        />
        <Button onClick={handleSend} size="icon" className={aiMode === "schedule" ? "bg-green-600 hover:bg-green-700" : "bg-yellow-400 hover:bg-yellow-500 text-black"}>
          {aiMode === "schedule" ? <Check className="w-5 h-5"/> : <Send className="w-5 h-5" />}
        </Button>
      </div>

      {/* 일정 확인 모달 */}
      <Dialog open={!!parsedSchedule} onOpenChange={() => setParsedSchedule(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>일정을 등록할까요?</DialogTitle></DialogHeader>
            <div className="py-4 space-y-2 text-sm">
                <div className="flex gap-2"><span className="font-bold w-10">제목:</span> {parsedSchedule?.title}</div>
                <div className="flex gap-2"><span className="font-bold w-10">일시:</span> {parsedSchedule?.date} {parsedSchedule?.time}</div>
                <div className="flex gap-2"><span className="font-bold w-10">장소:</span> {parsedSchedule?.location}</div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setParsedSchedule(null)}>취소</Button>
                <Button onClick={confirmSchedule}>등록</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}