"use client"

import { useState, useEffect, useRef } from "react"
import { Send, ArrowLeft, Sparkles, MapPin, Calendar, Check, List as ListIcon, CheckCircle, Share, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ChatRoom { id: string; name: string; lastMessage: string; time: string; unread: number; isGroup: boolean; }
interface ChatMessage { 
    user_id: number; name: string; avatar: string; content: string; timestamp: string; 
    isMe?: boolean; type?: "text" | "recommendation" | "system" | "proposal" | "vote_card"; 
    data?: any; all_slots?: string[]; message_id?: number;
}
interface ParsedSchedule { title: string; date: string; time: string; location_name: string; purpose: string; duration_hours?: number; tags?: string[]; }

// 🌟 [수정] 홈 탭과 동일한 상세 필터 데이터 적용
const PURPOSE_FILTERS: Record<string, any> = {
    "식사": {
        label: "🍚 식사",
        tabs: {
            "MENU": { label: "메뉴 선택", options: ["한식", "양식", "일식", "중식", "아시안", "고기", "분식", "치킨/버거"] },
            "VIBE": { label: "분위기", options: ["가성비", "혼밥가능", "캐주얼한", "푸짐한", "깔끔한", "웨이팅맛집", "숨은맛집"] },
            "ETC": { label: "편의", options: ["주차가능", "아이동반", "브레이크타임X", "예약가능"] }
        }
    },
    "비즈니스/접대": {
        label: "👔 비즈니스",
        tabs: {
            "SITUATION": { label: "만남 성격", options: ["식사미팅", "술", "커피챗", "회의/워크샵"] },
            "PLACE": { label: "장소 유형", options: ["회의실", "공유오피스", "세미나실", "비즈니스센터", "컨퍼런스룸","스터디룸", "워크스페이스"] },
            "CONDITION": { label: "필수 조건", options: ["조용한", "발렛파킹", "무료주차", "법인카드", "예약필수"] }
        }
    },
    "데이트/기념일": {
        label: "💖 데이트",
        tabs: {
            "COURSE": { label: "데이트 코스", options: ["맛집탐방", "카페투어", "술 한잔", "문화생활", "액티비티", "호캉스"] },
            "VIBE": { label: "분위기", options: ["분위기깡패", "뷰맛집", "로맨틱", "인스타감성", "이색데이트", "조용한"] },
            "MENU": { label: "선호 메뉴", options: ["파스타", "스테이크", "오마카세", "와인", "칵테일", "디저트"] }
        }
    },
    "술/회식": {
        label: "🍺 술/회식",
        tabs: {
            "TYPE": { label: "주종", options: ["소주/맥주", "와인/칵테일", "전통주/막걸리", "위스키/하이볼"] },
            "VIBE": { label: "분위기", options: ["시끌벅적", "회식장소", "노포감성", "힙한", "대화하기좋은", "2차로좋은"] },
            "FOOD": { label: "안주", options: ["고기/구이", "회/해산물", "탕/찌개", "튀김/전", "가벼운안주"] }
        }
    },
    "카페": {
        label: "☕ 카페",
        tabs: {
            "TYPE": { label: "목적", options: ["수다/모임", "스터디/작업", "디저트맛집", "테이크아웃"] },
            "VIBE": { label: "분위기", options: ["감성적인", "뷰맛집", "식물카페", "한옥카페", "모던한", "힙한"] },
            "MENU": { label: "메뉴", options: ["커피맛집", "베이커리", "케이크", "빙수", "시그니처라떼"] }
        }
    },
    "스터디/작업": {
        label: "📚 스터디",
        tabs: {
            "SPACE": { label: "공간 유형", options: ["카공(카페)", "스터디카페", "북카페", "무인카페", "도서관"] },
            "ENV": { label: "환경", options: ["조용한", "백색소음", "넓은책상", "편한의자", "오래있어도됨"] },
            "FACILITY": { label: "시설", options: ["콘센트많음", "와이파이빵빵", "회의실", "프린트가능"] }
        }
    }
};

export function ChatTab() {
  const [view, setView] = useState<'LIST' | 'CHAT'>('LIST');
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  
  // AI 메뉴 상태
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"none" | "schedule">("none");
  
  // [신규] 필터 상태
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedPurpose, setSelectedPurpose] = useState("식사");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [parsedSchedule, setParsedSchedule] = useState<ParsedSchedule | null>(null);
  const [allAvailableSlots, setAllAvailableSlots] = useState<string[]>([]); 
  const [isTimeListOpen, setIsTimeListOpen] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [myId, setMyId] = useState<number>(1);

  // 현재 목적의 필터 정보 가져오기
  const currentFilters = PURPOSE_FILTERS[selectedPurpose];

  useEffect(() => {
      const storedId = localStorage.getItem("userId");
      if (storedId) setMyId(parseInt(storedId));
      fetchRooms();
  }, []);

  useEffect(() => {
      if (view === 'CHAT') setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [messages, view]);

  const fetchRooms = async () => {
      try {
          const res = await fetch("https://wemeet-backend-xqlo.onrender.com/api/chat/rooms", { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } });
          if (res.ok) setChatRooms(await res.json());
      } catch (e) { console.error(e); }
  }

  const enterRoom = (room: ChatRoom) => {
      setCurrentRoom(room);
      setView('CHAT');
      setMessages([]);
      const ws = new WebSocket(`wss://wemeet-backend-xqlo.onrender.com/ws/${room.id}/${myId}`);
      
      ws.onmessage = (event) => {
          try {
              const msg = JSON.parse(event.data);
              
              if (msg.type === 'vote_update') {
                  setMessages(prev => prev.map(m => {
                      if (m.message_id === msg.message_id) {
                          let contentData: any = {};
                          try { contentData = JSON.parse(m.content); } catch(e) {}
                          contentData.vote_count = msg.count;
                          return { ...m, content: JSON.stringify(contentData) };
                      }
                      return m;
                  }));
                  return;
              }
              setMessages(prev => [...prev, { ...msg, isMe: msg.user_id === myId }]);
          } catch(e) {}
      };
      socketRef.current = ws;
  };

  const leaveRoom = () => { socketRef.current?.close(); setView('LIST'); setCurrentRoom(null); };

  const handleSend = async () => {
      if (!inputText.trim()) return;

      if (aiMode === "schedule") {
          try {
              const res = await fetch('https://wemeet-backend-xqlo.onrender.com/api/ai/parse-schedule', {
                  method: 'POST', headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ text: inputText })
              });
              if (res.ok) {
                  const data = await res.json();
                  setParsedSchedule(data); 
              }
          } catch (e) { alert("AI 분석 실패"); }
          setInputText("");
          setAiMode("none");
          return;
      }

      if (socketRef.current) {
        socketRef.current.send(JSON.stringify({ content: inputText, type: "text" }));
      }
      setInputText("");
  };

  const handleVote = async (messageId: number) => {
    const token = localStorage.getItem("token");
    try {
        await fetch("https://wemeet-backend-xqlo.onrender.com/api/chat/vote", {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ message_id: messageId, vote_type: "up" })
        });
    } catch (e) { console.error(e); }
  };

  const handleConfirm = async (placeName: string) => {
      if (!currentRoom) return;
      if (!confirm(`'${placeName}'(으)로 모임 장소를 확정하시겠습니까?\n모든 멤버의 캘린더에 등록됩니다.`)) return;

      const token = localStorage.getItem("token");
      const tempDate = new Date();
      tempDate.setDate(tempDate.getDate() + 1);
      const dateStr = `${tempDate.getFullYear()}-${String(tempDate.getMonth()+1).padStart(2,'0')}-${String(tempDate.getDate()).padStart(2,'0')} 19:00`;

      try {
          await fetch("https://wemeet-backend-xqlo.onrender.com/api/chat/confirm", {
              method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify({
                  room_id: currentRoom.id,
                  place_name: placeName,
                  date_time: dateStr
              })
          });
      } catch (e) { alert("오류가 발생했습니다."); }
  };
  
  const confirmSchedule = async () => {
      if (!parsedSchedule) return;
      const token = localStorage.getItem("token");
      try {
          await fetch('https://wemeet-backend-xqlo.onrender.com/api/events', {
              method: 'POST', 
              headers: {'Content-Type': 'application/json', "Authorization": `Bearer ${token}`},
              body: JSON.stringify({ ...parsedSchedule, user_id: myId })
          });
          alert("일정이 캘린더에 등록되었습니다!");
          setParsedSchedule(null);
      } catch (e) { alert("등록 실패"); }
  };
  
  // [수정] 필터 토글 핸들러
  const toggleTag = (tag: string) => {
      if (selectedTags.includes(tag)) setSelectedTags(prev => prev.filter(t => t !== tag));
      else setSelectedTags(prev => [...prev, tag]);
  };

  // [수정] AI 추천 트리거 (필터 정보 포함)
  const triggerSmartRecommend = async () => {
      if (!currentRoom) return;
      setIsAiMenuOpen(false);
      setIsFilterOpen(false); // 모달 닫기
      
      // 사용자에게 알림
      setMessages(prev => [...prev, { 
          user_id: 0, name: "WeMeet AI", avatar: "🤖", 
          content: JSON.stringify({ 
              type: "system", 
              text: `💡 [${selectedPurpose}] 조건으로 장소를 찾고 있습니다...\n옵션: ${selectedTags.join(", ") || "전체"}` 
          }), 
          timestamp: "Now", type: "system", isMe: false 
      }]);

      try {
          const res = await fetch('https://wemeet-backend-xqlo.onrender.com/api/meeting-flow', {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                  room_id: currentRoom.id, 
                  participants: [], 
                  purpose: selectedPurpose, // 선택된 목적
                  user_tags: selectedTags   // 선택된 태그들
              })
          });
          
          if (res.ok) {
              const data = await res.json(); 
              if (socketRef.current) {
                  socketRef.current.send(JSON.stringify({
                      content: "약속 제안 카드가 도착했습니다!", 
                      type: "proposal", 
                      data: data.cards,
                      all_slots: data.all_available_slots 
                  }));
              }
          }
      } catch (e) { console.error(e); }
  };

  if (view === 'CHAT' && currentRoom) {
      return (
        <div className="h-full flex flex-col bg-[#b2c7d9]">
            <div className="bg-white/95 backdrop-blur p-3 border-b flex items-center gap-3 sticky top-0 z-10 shadow-sm">
                <Button variant="ghost" size="icon" onClick={leaveRoom}><ArrowLeft className="w-6 h-6"/></Button>
                <h2 className="font-bold text-lg truncate max-w-[150px]">{currentRoom.name}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => {
                    let parsedContent: any = {};
                    let msgType = msg.type || "text";
                    
                    try { 
                        parsedContent = JSON.parse(msg.content);
                        msgType = parsedContent.type || "text";
                    } catch {
                        parsedContent = { text: msg.content };
                    }

                    if (msgType === 'system') {
                        return (
                            <div key={idx} className="flex justify-center my-4">
                                <div className="bg-black/40 text-white text-xs px-4 py-2 rounded-full text-center whitespace-pre-wrap">
                                    {parsedContent.text}
                                </div>
                            </div>
                        );
                    }

                    if (msgType === 'vote_card') {
                        const place = parsedContent.place || {};
                        const voteCount = parsedContent.vote_count || 0;

                        return (
                            <div key={idx} className="my-2 mx-4 flex justify-center">
                                <Card className="overflow-hidden border-indigo-100 shadow-md w-full max-w-[280px]">
                                    <div className="bg-indigo-50 p-3 border-b border-indigo-100 flex justify-between items-center">
                                        <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                                            <MapPin className="w-3 h-3"/> 장소 추천
                                        </span>
                                        <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                                    </div>
                                    <div className="p-4 text-center space-y-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800">{place.name}</h3>
                                            <p className="text-xs text-gray-500 mt-1">{place.category} · {place.tags?.join(' ')}</p>
                                        </div>
                                        <div className="flex flex-col gap-2 pt-2">
                                            <Button 
                                                size="sm" 
                                                className="bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 w-full font-bold"
                                                onClick={() => handleVote((msg as any).message_id)}
                                            >
                                                👍 좋아요 ({voteCount})
                                            </Button>
                                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white w-full font-bold" onClick={() => handleConfirm(place.name)}>
                                                <CheckCircle className="w-3 h-3 mr-1"/> 이 장소로 확정하기
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        );
                    }

                    if (msgType === 'proposal') {
                        const data = parsedContent.data || [];
                        return (
                            <div key={idx} className="flex flex-col gap-2 my-4 w-full">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Calendar className="w-3 h-3"/> AI 스마트 제안
                                    </div>
                                    {parsedContent.all_slots && (
                                        <button onClick={() => { setAllAvailableSlots(parsedContent.all_slots || []); setIsTimeListOpen(true); }} className="text-xs text-blue-600 flex items-center gap-1 font-bold hover:underline">
                                            <ListIcon className="w-3 h-3"/> 다른 시간대
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-hide snap-x snap-mandatory">
                                    {Array.isArray(data) && data.map((card: any, cIdx: number) => (
                                        <Card key={cIdx} className="min-w-[260px] w-[260px] bg-white shadow-lg border-0 rounded-2xl overflow-hidden snap-center flex-shrink-0">
                                            <div className="bg-indigo-600 p-4 text-white relative">
                                                <div className="text-xs font-medium opacity-80">추천 {cIdx + 1}안</div>
                                                <div className="text-lg font-bold mt-1">{card.time.split(' ')[0]} <br/><span className="text-3xl">{card.time.split(' ')[1]}</span></div>
                                            </div>
                                            <div className="p-4">
                                                <div className="flex items-center gap-2 mb-2 text-gray-600 text-xs font-bold"><MapPin className="w-3 h-3"/> {card.region}</div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-1">{card.place.name}</h3>
                                                <div className="flex gap-1 flex-wrap mb-4">{card.place.tags && card.place.tags.slice(0, 3).map((t:string, i:number) => (<Badge key={i} variant="secondary" className="text-[10px] px-1.5">{t}</Badge>))}</div>
                                                <Button className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold" onClick={() => { setParsedSchedule({title: `${card.place.name} 모임`, date: card.time.split(' ')[0], time: card.time.split(' ')[1], location_name: card.place.name, purpose: "약속"}); }}>이걸로 결정!</Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={idx} className={`flex gap-2 ${msg.isMe ? "flex-row-reverse" : "flex-row"}`}>
                            {!msg.isMe && <Avatar className="w-8 h-8 mt-1"><AvatarFallback>{msg.name[0]}</AvatarFallback></Avatar>}
                            <div className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"} max-w-[75%]`}>
                                {!msg.isMe && <span className="text-xs text-gray-600 mb-1 ml-1">{msg.name}</span>}
                                <div className={`px-3 py-2 rounded-[18px] text-sm shadow-sm break-words ${msg.isMe ? "bg-[#FEE500] text-black rounded-tr-sm" : "bg-white text-black rounded-tl-sm"}`}>
                                    {parsedContent.text || msg.content}
                                </div>
                                <span className="text-[10px] text-gray-500 mt-1 px-1">{msg.timestamp}</span>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            <div className="p-3 bg-white border-t flex gap-2 sticky bottom-0 items-center">
                {/* 🌟 WM (AI) 버튼 - 누르면 필터 모달이 뜸 */}
                <Popover open={isAiMenuOpen} onOpenChange={setIsAiMenuOpen}>
                    <PopoverTrigger asChild>
                        <Button size="icon" className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:opacity-90 rounded-full shadow-lg w-10 h-10 flex-shrink-0">
                            <span className="font-bold text-xs">WM</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-2" align="start" side="top">
                        <div className="flex flex-col gap-1">
                            <Button variant="ghost" className="justify-start h-9 text-sm" onClick={() => { 
                                setAiMode("schedule"); 
                                setIsAiMenuOpen(false);
                                setMessages(prev => [...prev, { 
                                    user_id: 0, name: "WeMeet AI", avatar: "🤖", 
                                    content: JSON.stringify({ type: "system", text: "📅 일정 등록 모드입니다.\n'내일 저녁 7시 강남역 회식' 처럼 입력해주세요." }), 
                                    timestamp: "Now", type: "system", isMe: false 
                                }]);
                            }}>
                                <Calendar className="w-4 h-4 mr-2 text-green-600"/> 일정 등록 (자연어)
                            </Button>
                            {/* 👇 스마트 추천 버튼: 필터 모달 열기 */}
                            <Button variant="ghost" className="justify-start h-9 text-sm" onClick={() => { setIsAiMenuOpen(false); setIsFilterOpen(true); }}>
                                <Sparkles className="w-4 h-4 mr-2 text-purple-500"/> 스마트 모임 제안
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Input 
                    value={inputText} 
                    onChange={e => setInputText(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleSend()} 
                    placeholder={aiMode === "schedule" ? "예: 내일 저녁 7시 강남역 회식" : "메시지 입력..."} 
                    className={`flex-1 border-none focus-visible:ring-0 rounded-full px-4 ${aiMode === "schedule" ? "bg-green-50 ring-2 ring-green-500" : "bg-gray-100"}`}
                />
                <Button onClick={handleSend} size="icon" className={`rounded-full ${aiMode === "schedule" ? "bg-green-600 hover:bg-green-700" : "bg-[#FEE500] hover:bg-[#FEDD00] text-black"}`}>
                    <Send className="w-4 h-4" />
                </Button>
            </div>
            
            {/* 🌟 [신규] 상세 필터 모달 (채팅방용) */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DialogContent className="sm:max-w-md h-[70vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">
                    <DialogHeader className="px-6 pt-4 pb-2 bg-white border-b"><DialogTitle>AI 추천 조건 설정</DialogTitle></DialogHeader>
                    
                    <div className="px-4 py-3 bg-gray-50 border-b">
                        <div className="text-xs font-bold text-gray-500 mb-2">모임의 목적</div>
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                            {Object.keys(PURPOSE_FILTERS).map((purposeKey) => (
                                <Button 
                                    key={purposeKey} 
                                    variant={selectedPurpose === purposeKey ? "default" : "outline"}
                                    className={`rounded-full h-8 text-xs flex-shrink-0 ${selectedPurpose === purposeKey ? "bg-indigo-600" : "text-gray-600"}`}
                                    onClick={() => { setSelectedPurpose(purposeKey); setSelectedTags([]); }}
                                >
                                    {PURPOSE_FILTERS[purposeKey].label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col bg-white overflow-hidden">
                        {currentFilters && (
                          <Tabs defaultValue={Object.keys(currentFilters.tabs)[0]} className="flex-1 flex flex-col">
                              <div className="px-4 pt-2 border-b">
                                  <TabsList className="w-full grid grid-cols-3 h-auto p-1 bg-gray-100 rounded-lg">
                                      {Object.keys(currentFilters.tabs).map((tabKey) => (
                                          <TabsTrigger key={tabKey} value={tabKey} className="text-xs py-1.5">{currentFilters.tabs[tabKey].label}</TabsTrigger>
                                      ))}
                                  </TabsList>
                              </div>
                              <div className="flex-1 overflow-y-auto p-4">
                                  {Object.entries(currentFilters.tabs).map(([tabKey, tabData]: any) => (
                                      <TabsContent key={tabKey} value={tabKey} className="mt-0 h-full">
                                          <div className="grid grid-cols-3 gap-2">
                                              {tabData.options.map((opt: string) => (
                                                  <Button 
                                                      key={opt} 
                                                      variant={selectedTags.includes(opt) ? "default" : "outline"}
                                                      className={`h-auto py-2 px-1 text-xs break-keep ${selectedTags.includes(opt) ? "bg-indigo-100 text-indigo-700 border-indigo-300" : "text-gray-600 border-gray-200"}`}
                                                      onClick={() => toggleTag(opt)}
                                                  >
                                                      {opt}
                                                  </Button>
                                              ))}
                                          </div>
                                      </TabsContent>
                                  ))}
                              </div>
                          </Tabs>
                        )}
                    </div>
                    
                    <div className="p-4 border-t bg-white">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={triggerSmartRecommend}>
                            <Sparkles className="w-4 h-4 mr-2"/> AI 추천 시작하기
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 모달들 (시간표, 일정확인) */}
            <Dialog open={isTimeListOpen} onOpenChange={setIsTimeListOpen}>
                <DialogContent className="sm:max-w-sm rounded-xl max-h-[80vh] flex flex-col">
                    <DialogHeader><DialogTitle>🕒 모든 가능 시간대</DialogTitle></DialogHeader>
                    <div className="flex-1 overflow-y-auto py-2 grid grid-cols-2 gap-2">
                        {allAvailableSlots.map((slot, idx) => {
                            const [date, time] = slot.split(' ');
                            return (<Button key={idx} variant="outline" className="justify-start h-auto py-3 px-4 border-gray-200" onClick={() => { setParsedSchedule({title: `모임 약속`, date: date, time: time, location_name: "장소 미정", purpose: "약속"}); setIsTimeListOpen(false); }}><div className="text-left"><div className="text-xs text-gray-500">{date}</div><div className="text-lg font-bold text-indigo-600">{time}</div></div></Button>)
                        })}
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={!!parsedSchedule} onOpenChange={() => setParsedSchedule(null)}>
                <DialogContent className="sm:max-w-xs rounded-xl">
                    <DialogHeader><DialogTitle>🗓️ 일정 등록</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-3 text-sm">
                        <div className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">📝</div><div><div className="font-bold">{parsedSchedule?.title}</div><div className="text-xs text-gray-500">{parsedSchedule?.purpose}</div></div></div>
                        <div className="space-y-1 px-1">
                            <div className="flex justify-between"><span className="text-gray-500">날짜</span> <span className="font-medium">{parsedSchedule?.date}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">시간</span> <span className="font-medium">{parsedSchedule?.time}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">예상 소요</span> <span className="font-medium text-blue-600">{parsedSchedule?.duration_hours || 2}시간</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">장소</span> <span className="font-medium">{parsedSchedule?.location_name}</span></div>
                        </div>
                        {parsedSchedule?.tags && parsedSchedule.tags.length > 0 && (<div className="flex gap-1 flex-wrap pt-2">{parsedSchedule.tags.map((tag, i) => <Badge key={i} variant="secondary" className="text-[10px]">#{tag}</Badge>)}</div>)}
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setParsedSchedule(null)}>취소</Button><Button onClick={confirmSchedule}>등록</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      );
  }
  
  return (
    <div className="h-full flex flex-col bg-slate-50">
       <div className="p-4 border-b bg-white flex justify-between items-center sticky top-0 z-10"><h1 className="text-xl font-bold">채팅</h1></div>
       <div className="flex-1 overflow-y-auto">
           {chatRooms.map((room) => (
               <div key={room.id} onClick={() => enterRoom(room)} className="flex items-center gap-4 p-4 bg-white hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors">
                   <Avatar className="h-12 w-12 border"><AvatarFallback className="bg-indigo-100 text-indigo-600 font-bold">{room.name[0]}</AvatarFallback></Avatar>
                   <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-baseline mb-1">
                           <h3 className="font-bold text-base truncate">{room.name}</h3>
                           <span className="text-xs text-gray-400 flex-shrink-0">{room.time}</span>
                       </div>
                       <p className="text-sm text-gray-500 truncate">{room.lastMessage}</p>
                   </div>
                   {room.unread > 0 && <Badge className="bg-red-500 hover:bg-red-600 h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full">{room.unread}</Badge>}
               </div>
           ))}
           {chatRooms.length === 0 && <div className="flex-1 flex flex-col items-center justify-center text-gray-400 mt-20"><p>참여 중인 채팅방이 없습니다.</p></div>}
       </div>
    </div>
  )
}