"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock, Trash2, Lock, Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch" // 토글 스위치 추가
import { Label } from "@/components/ui/label"

interface Event { 
    id?: string; 
    user_id: number; 
    title: string; 
    date: string; 
    time: string; 
    duration_hours: number; 
    location_name?: string; 
    purpose: string;
    is_private?: boolean; // 🔒 [신규] 공개 여부 필드
}

const INITIAL_EVENT: Omit<Event, 'id'> = { 
    user_id: 0, 
    title: '', 
    date: new Date().toISOString().split('T')[0], 
    time: '19:00', 
    duration_hours: 1.5, 
    purpose: 'meal', 
    location_name: '',
    is_private: false // 기본값 공개
};

const purposeOptions = ['meal', 'date', 'business', 'drinking', 'study', 'cafe'];
const DEFAULT_DURATIONS: Record<string, number> = { 'meal': 2, 'drinking': 3, 'date': 3, 'business': 1, 'study': 2, 'cafe': 1.5 };

export function CalendarTab() {
  const [events, setEvents] = useState<Event[]>([])
  const [currentDate, setCurrentDate] = useState(new Date()) 
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Event | Omit<Event, 'id'>>(INITIAL_EVENT)
  const [isEditing, setIsEditing] = useState(false) 
  const [isFullCalendarOpen, setIsFullCalendarOpen] = useState(false);

  const [myId, setMyId] = useState<number>(0)
  const [selectedUserId, setSelectedUserId] = useState<number>(0) // 현재 보고 있는 캘린더 주인
  const [myProfile, setMyProfile] = useState<any>(null)
  const [friendList, setFriendList] = useState<any[]>([]) // 실제 친구 목록

  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    const currentId = storedId ? parseInt(storedId) : 0;
    setMyId(currentId);
    setSelectedUserId(currentId); // 처음엔 내 캘린더 보기

    // 1. 내 정보 및 친구 목록 가져오기 (실제 API 연동)
    const fetchInitData = async () => {
        try {
            // 내 정보
            const meRes = await fetch("https://wemeet-backend-xqlo.onrender.com/api/users/me", { 
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } 
            });
            if (meRes.ok) {
                const meData = await meRes.json();
                setMyProfile(meData);
            }

            // 친구 목록 (지금은 전체 유저 중 일부를 친구로 가정하거나, 커뮤니티 멤버를 가져옴)
            // 여기서는 편의상 커뮤니티 API를 활용해 유저들을 가져옵니다.
            const commRes = await fetch("https://wemeet-backend-xqlo.onrender.com/api/communities");
            if (commRes.ok) {
                const commData = await commRes.json();
                // 모든 커뮤니티의 멤버들을 수집하여 중복 제거 후 친구 목록으로 사용
                const allMembers = new Map();
                commData.forEach((c: any) => {
                    c.current_members.forEach((m: any) => {
                        if (m.id !== currentId) allMembers.set(m.id, m);
                    });
                });
                setFriendList(Array.from(allMembers.values()));
            }
        } catch (e) { console.error(e); }
    };
    
    fetchInitData();
    fetchEvents();
  }, []);

  const fetchEvents = async () => { 
      try { 
          const res = await fetch('https://wemeet-backend-xqlo.onrender.com/api/events', { cache: 'no-store' }); 
          if (res.ok) {
              setEvents(await res.json()); 
          }
      } catch (e) { console.error(e); } 
  }

  const handlePurposeChange = (newPurpose: string) => {
      const defaultDur = DEFAULT_DURATIONS[newPurpose] || 1.5;
      setFormData(prev => ({ ...prev, purpose: newPurpose, duration_hours: defaultDur }));
  };

  const handleSubmit = async () => {
    if (!formData.title) return alert("제목 입력은 필수입니다.");
    
    const isEditMode = isEditing && (formData as Event).id;
    const url = isEditMode
        ? `https://wemeet-backend-xqlo.onrender.com/api/events/${(formData as Event).id}` 
        : 'https://wemeet-backend-xqlo.onrender.com/api/events';
    const method = isEditMode ? 'PUT' : 'POST';
    
    // 항상 내 아이디로 저장
    const payload = { ...formData, user_id: myId };

    try { 
        const res = await fetch(url, { 
            method, 
            headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${localStorage.getItem("token")}` }, 
            body: JSON.stringify(payload) 
        }); 
        
        if (res.ok) { 
            const savedEvent = await res.json(); 
            if (isEditMode) {
                setEvents(prev => prev.map(e => e.id === savedEvent.id ? savedEvent : e));
                alert("수정되었습니다.");
            } else {
                setEvents(prev => [...prev, savedEvent]);
                alert("등록되었습니다.");
            }
            setShowForm(false); 
        } else {
            alert("저장 실패");
        }
    } catch (e) { alert('서버 오류가 발생했습니다.'); }
  }

  const handleDelete = async (id: string) => {
    if (!id) return;
    if (confirm('정말 삭제하시겠습니까?')) { 
        try {
            const res = await fetch(`https://wemeet-backend-xqlo.onrender.com/api/events/${id}`, { 
                method: 'DELETE',
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            }); 
            if (res.ok) { 
                setEvents(prev => prev.filter(e => e.id !== id));
                setShowForm(false);
                alert("삭제되었습니다."); 
            }
        } catch (e) { console.error(e); }
    } 
  }
  
  const openEditModal = (event: Event) => { 
      // 남의 일정은 수정 불가 (보기만 가능)
      if (event.user_id !== myId) {
          alert("친구의 일정은 수정할 수 없습니다.");
          return;
      }
      setFormData(event); setIsEditing(true); setShowForm(true); 
  }
  
  const openCreateModal = () => { 
      if (selectedUserId !== myId) {
          // 친구 캘린더를 보고 있을 때 추가 버튼 누르면 내 캘린더로 돌아옴
          setSelectedUserId(myId);
      }
      setFormData({ ...INITIAL_EVENT, user_id: myId }); 
      setIsEditing(false); setShowForm(true); 
  }

  // 🌟 [필터링 핵심] 
  // 1. 선택된 유저의 일정만 보여줌
  // 2. 만약 친구 캘린더(selectedUserId !== myId)라면, 'is_private'가 true인 일정은 숨김
  const filteredEvents = useMemo(() => {
      return events.filter(e => {
          if (e.user_id !== selectedUserId) return false; // 해당 유저 것만
          if (selectedUserId !== myId && e.is_private) return false; // 남의 비공개 일정은 숨김
          return true;
      });
  }, [events, selectedUserId, myId]);

  const getEventsForDate = (date: Date) => filteredEvents.filter(e => e.date === format(date, 'yyyy-MM-dd'));
  
  // ... (캘린더 렌더링 로직은 기존과 동일하므로 유지) ...
  const renderTwoWeeks = () => {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const days = [];
      for (let i = 0; i < 14; i++) {
          const day = addDays(start, i);
          const dayEvents = getEventsForDate(day);
          days.push(
              <div key={i} className={`flex flex-col items-center p-1 border-r border-b h-24 ${isSameDay(day, new Date()) ? 'bg-blue-50' : ''}`} onClick={() => { 
                  if(selectedUserId === myId) { setFormData({ ...INITIAL_EVENT, date: format(day, 'yyyy-MM-dd'), user_id: myId }); setIsEditing(false); setShowForm(true); }
              }}>
                  <span className={`text-xs font-bold mb-1 ${i % 7 === 0 ? 'text-red-500' : ''}`}>{format(day, 'd')}</span>
                  <div className="flex flex-col gap-1 w-full px-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map(e => (
                          <div key={e.id} onClick={(ev) => { ev.stopPropagation(); openEditModal(e); }} className={`text-[10px] px-1.5 py-0.5 rounded truncate shadow-sm cursor-pointer ${e.is_private ? 'bg-gray-400 text-white' : 'bg-indigo-500 text-white'}`}>
                              {e.is_private && selectedUserId === myId ? '🔒 ' : ''}{e.title}
                          </div>
                      ))}
                  </div>
              </div>
          )
      }
      return <div className="grid grid-cols-7 border-t border-l cursor-pointer bg-white rounded-b-xl">{days}</div>;
  };

  const renderFullMonth = () => {
      const start = startOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
      const end = endOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
      const days = [];
      let day = start;
      while (day <= end) {
          const currentDay = day;
          const dayEvents = getEventsForDate(currentDay);
          days.push(
            <div key={day.toISOString()} className="min-h-[80px] border-r border-b p-1 hover:bg-gray-50 transition-colors" onClick={() => { if(selectedUserId === myId) { setFormData({ ...INITIAL_EVENT, date: format(currentDay, 'yyyy-MM-dd'), user_id: myId }); setIsEditing(false); setShowForm(true); setIsFullCalendarOpen(false); } }}>
                <span className={`text-sm font-semibold ${day.getMonth() !== currentDate.getMonth() ? 'text-gray-300' : ''}`}>{format(day, 'd')}</span>
                <div className="space-y-1 mt-1">
                    {dayEvents.map(e => <div key={e.id} onClick={(ev) => { ev.stopPropagation(); openEditModal(e); setIsFullCalendarOpen(false); }} className={`text-[10px] px-1 rounded truncate cursor-pointer ${e.is_private ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-800'}`}>{e.time} {e.title}</div>)}
                </div>
            </div>
          );
          day = addDays(day, 1);
      }
      return <div className="grid grid-cols-7 border-t border-l cursor-pointer">{days}</div>;
  }

  const upcomingList = filteredEvents.filter(e => {
      const dateStr = e.date.includes('T') ? e.date : `${e.date}T${e.time}`;
      const eventDate = new Date(dateStr);
      const today = new Date(); today.setHours(0,0,0,0);
      return eventDate >= today;
  }).sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()).slice(0, 3);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="sticky top-0 z-10 bg-white border-b p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">일정 {selectedUserId !== myId && <span className="text-sm text-gray-500 font-normal">(친구의 캘린더)</span>}</h1>
        {selectedUserId === myId && <Button size="sm" onClick={openCreateModal}><Plus className="w-4 h-4 mr-1"/> 추가</Button>}
      </div>
      
      <div className="px-4 py-3 bg-white border-b flex gap-3 overflow-x-auto scrollbar-hide">
            {/* 내 프로필 */}
            {myProfile && (
                <button onClick={() => setSelectedUserId(myProfile.id)} className={`flex flex-col items-center min-w-[50px] transition-opacity ${selectedUserId === myProfile.id ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 transition-all ${selectedUserId === myProfile.id ? "border-indigo-600 bg-indigo-50" : "border-transparent bg-gray-100"}`}>
                        {myProfile.avatar?.equipped?.body ? "🧑" : "👤"} {/* 아바타 이미지가 있다면 img 태그로 교체 가능 */}
                    </div>
                    <span className={`text-xs mt-1 ${selectedUserId === myProfile.id ? "font-bold text-indigo-600" : "text-gray-500"}`}>나</span>
                </button>
            )}
            {/* 친구 목록 (실제 유저들) */}
            {friendList.map(friend => (
                <button key={friend.id} onClick={() => setSelectedUserId(friend.id)} className={`flex flex-col items-center min-w-[50px] transition-opacity ${selectedUserId === friend.id ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 transition-all ${selectedUserId === friend.id ? "border-indigo-600 bg-indigo-50" : "border-transparent bg-gray-100"}`}>
                        👦
                    </div>
                    <span className={`text-xs mt-1 ${selectedUserId === friend.id ? "font-bold text-indigo-600" : "text-gray-500"}`}>{friend.name}</span>
                </button>
            ))}
      </div>

      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500"/> 다가오는 일정</h2>
            <div className="space-y-2">
                {upcomingList.length === 0 && <div className="text-center py-6 text-gray-400 bg-white rounded-xl border border-dashed text-sm">공개된 일정이 없습니다.</div>}
                {upcomingList.map(event => (
                    <Card key={event.id} onClick={() => openEditModal(event)} className={`cursor-pointer hover:bg-slate-50 border-l-4 transition-all shadow-sm hover:shadow-md ${event.is_private ? 'border-l-gray-400' : 'border-l-blue-500'}`}>
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-base flex items-center gap-1">
                                    {event.is_private && <Lock className="w-3 h-3 text-gray-400"/>} {event.title}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">{event.date} {event.time} · {event.location_name || '장소 미정'}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge variant="secondary" className="px-3 py-1">{event.purpose.toUpperCase()}</Badge>
                                <span className="text-[10px] text-gray-400">{event.duration_hours}시간</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>

        <section>
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-green-600"/> 2주간 일정</h2>
                <Dialog open={isFullCalendarOpen} onOpenChange={setIsFullCalendarOpen}>
                    <DialogTrigger asChild><Button variant="ghost" size="sm" className="text-xs text-blue-600 font-semibold">전체 달력 보기</Button></DialogTrigger>
                    <DialogContent className="max-w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl">
                        <DialogHeader className="p-4 pb-2 border-b bg-white sticky top-0 z-10">
                            <div className="flex justify-between items-center"><DialogTitle>{format(currentDate, 'yyyy년 M월')}</DialogTitle><div className="flex gap-2"><Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -30))}><ChevronLeft className="w-4 h-4"/></Button><Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 30))}><ChevronRight className="w-4 h-4"/></Button></div></div>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto p-2">{renderFullMonth()}</div>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 bg-gray-50 border-b py-2">
                    {['일','월','화','수','목','금','토'].map((d,i) => <div key={d} className={`text-center text-xs font-bold ${i===0?'text-red-500':'text-gray-600'}`}>{d}</div>)}
                </div>
                {renderTwoWeeks()}
            </div>
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 p-0">
            <Card className="w-full max-w-sm animate-in slide-in-from-bottom-10 sm:rounded-xl rounded-t-xl p-4 pb-8 bg-white">
                <CardHeader className="flex flex-row justify-between items-center p-0 mb-4">
                    <CardTitle className="text-lg">{isEditing ? "일정 수정" : "새 일정"}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-5 h-5"/></Button>
                </CardHeader>
                <CardContent className="space-y-4 p-0">
                    <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">제목</Label><Input placeholder="일정 제목" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">날짜</Label><Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                        <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">시간</Label><Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-gray-500">카테고리</Label>
                            <select className="w-full h-10 px-3 border rounded-md text-sm bg-white" value={formData.purpose} onChange={e => handlePurposeChange(e.target.value)}>
                                {purposeOptions.map((p: string) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-gray-500">소요 시간 (시간)</Label>
                            <Input type="number" step="0.5" min="0.5" value={formData.duration_hours} onChange={e => setFormData({...formData, duration_hours: parseFloat(e.target.value)})} />
                        </div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-gray-500">장소</Label><Input placeholder="장소 (선택)" value={formData.location_name || ''} onChange={e => setFormData({...formData, location_name: e.target.value})} /></div>
                    
                    {/* 🌟 [신규] 공개 여부 토글 */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            {formData.is_private ? <Lock className="w-4 h-4 text-gray-500"/> : <Globe className="w-4 h-4 text-blue-500"/>}
                            <span className="text-sm font-bold">{formData.is_private ? "나만 보기 (비공개)" : "친구에게 공개"}</span>
                        </div>
                        <Switch checked={!formData.is_private} onCheckedChange={(c) => setFormData({...formData, is_private: !c})} />
                    </div>

                    <div className="flex gap-2 pt-2">
                        {isEditing && (<Button variant="destructive" className="w-12 bg-red-500 hover:bg-red-600 text-white" onClick={() => handleDelete((formData as Event).id!)}><Trash2 className="w-4 h-4"/></Button>)}
                        <Button className="flex-1 font-bold bg-indigo-600 hover:bg-indigo-700" onClick={handleSubmit}>{isEditing ? "수정 완료" : "등록하기"}</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  )
}