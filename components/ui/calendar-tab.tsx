"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Event { 
    id?: string; 
    user_id: number; 
    title: string; 
    date: string; 
    time: string; 
    duration_hours: number; 
    location_name?: string; 
    purpose: string; 
}

const DEMO_USERS = [
  { id: 1, name: "나(안암)", avatar: "👤" },
  { id: 2, name: "클레오", avatar: "👦" },
  { id: 3, name: "벤지", avatar: "🧑" },
  { id: 4, name: "로건", avatar: "👧" },
];

const INITIAL_EVENT: Omit<Event, 'id'> = { 
    user_id: 0, 
    title: '', 
    date: new Date().toISOString().split('T')[0], 
    time: '19:00', 
    duration_hours: 1.5, 
    purpose: 'meal', 
    location_name: '' 
};

const purposeOptions = ['meal', 'date', 'business', 'drinking', 'study', 'cafe'];

// 목적별 기본 시간 (프론트엔드용)
const DEFAULT_DURATIONS: Record<string, number> = {
    'meal': 2, 'drinking': 3, 'date': 3, 'business': 1, 'study': 2, 'cafe': 1.5
};

export function CalendarTab() {
  const [events, setEvents] = useState<Event[]>([])
  const [currentDate, setCurrentDate] = useState(new Date()) 
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Event | Omit<Event, 'id'>>(INITIAL_EVENT)
  const [isEditing, setIsEditing] = useState(false) 
  const [isFullCalendarOpen, setIsFullCalendarOpen] = useState(false);

  const [myId, setMyId] = useState<number>(0)
  const [selectedFriendId, setSelectedFriendId] = useState<number>(0)
  const [myProfile, setMyProfile] = useState<any>(null)
  const [friendList, setFriendList] = useState<any[]>([])

  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    const currentId = storedId ? parseInt(storedId) : 1;
    setMyId(currentId);
    setSelectedFriendId(currentId);
    const me = DEMO_USERS.find(u => u.id === currentId);
    if (me) { setMyProfile(me); setFriendList(DEMO_USERS.filter(u => u.id !== currentId)); }
    else { setMyProfile({ id: currentId, name: "나", avatar: "👤" }); setFriendList(DEMO_USERS); }
    fetchEvents();
  }, []);

  const fetchEvents = async () => { 
      try { 
          const res = await fetch('http://127.0.0.1:8000/api/events', { cache: 'no-store' }); 
          if (res.ok) {
              const data = await res.json();
              setEvents(data); 
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
        ? `http://127.0.0.1:8000/api/events/${(formData as Event).id}` 
        : 'http://127.0.0.1:8000/api/events';
    const method = isEditMode ? 'PUT' : 'POST';
    
    const payload = { ...formData, user_id: selectedFriendId };

    try { 
        const res = await fetch(url, { 
            method, 
            headers: { 'Content-Type': 'application/json' }, 
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
            const err = await res.json();
            alert(`실패: ${err.detail || "저장할 수 없습니다."}`);
        }
    } catch (e) { alert('서버 오류가 발생했습니다.'); }
  }

  const handleDelete = async (id: string) => {
    if (!id) return alert("일정 ID 오류");
    if (confirm('정말 이 일정을 삭제하시겠습니까?')) { 
        try {
            setEvents(prev => prev.filter(e => e.id !== id));
            setShowForm(false);
            const res = await fetch(`http://127.0.0.1:8000/api/events/${id}`, { method: 'DELETE' }); 
            if (res.ok) { alert("삭제되었습니다."); } else { alert("이미 삭제되었거나 존재하지 않는 일정입니다."); }
            fetchEvents();
        } catch (e) { console.error(e); }
    } 
  }
  
  const openEditModal = (event: Event) => { setFormData(event); setIsEditing(true); setShowForm(true); }
  const openCreateModal = () => { setFormData({ ...INITIAL_EVENT, user_id: selectedFriendId }); setIsEditing(false); setShowForm(true); }

  const filteredEvents = useMemo(() => events.filter(e => e.user_id === selectedFriendId), [events, selectedFriendId]);
  const getEventsForDate = (date: Date) => filteredEvents.filter(e => e.date === format(date, 'yyyy-MM-dd'));
  
  const renderTwoWeeks = () => {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const days = [];
      for (let i = 0; i < 14; i++) {
          const day = addDays(start, i);
          const dayEvents = getEventsForDate(day);
          days.push(
              <div key={i} className={`flex flex-col items-center p-1 border-r border-b h-24 ${isSameDay(day, new Date()) ? 'bg-blue-50' : ''}`} onClick={() => { setFormData({ ...INITIAL_EVENT, date: format(day, 'yyyy-MM-dd'), user_id: selectedFriendId }); setIsEditing(false); setShowForm(true); }}>
                  <span className={`text-xs font-bold mb-1 ${i % 7 === 0 ? 'text-red-500' : ''}`}>{format(day, 'd')}</span>
                  <div className="flex flex-col gap-1 w-full px-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map(e => (
                          <div key={e.id} onClick={(ev) => { ev.stopPropagation(); openEditModal(e); }} className="text-[10px] bg-primary/90 text-white px-1.5 py-0.5 rounded truncate shadow-sm cursor-pointer">{e.title}</div>
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
            <div key={day.toISOString()} className="min-h-[80px] border-r border-b p-1 hover:bg-gray-50 transition-colors" onClick={() => { setFormData({ ...INITIAL_EVENT, date: format(currentDay, 'yyyy-MM-dd'), user_id: selectedFriendId }); setIsEditing(false); setShowForm(true); setIsFullCalendarOpen(false); }}>
                <span className={`text-sm font-semibold ${day.getMonth() !== currentDate.getMonth() ? 'text-gray-300' : ''}`}>{format(day, 'd')}</span>
                <div className="space-y-1 mt-1">
                    {dayEvents.map(e => <div key={e.id} onClick={(ev) => { ev.stopPropagation(); openEditModal(e); setIsFullCalendarOpen(false); }} className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded truncate cursor-pointer">{e.time} {e.title}</div>)}
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
      const today = new Date();
      today.setHours(0,0,0,0);
      return eventDate >= today;
  }).sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()).slice(0, 3);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="sticky top-0 z-10 bg-white border-b p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">일정</h1>
        <Button size="sm" onClick={openCreateModal}><Plus className="w-4 h-4 mr-1"/> 추가</Button>
      </div>
      
      <div className="px-4 py-3 bg-white border-b flex gap-3 overflow-x-auto scrollbar-hide">
            {myProfile && (
                <button onClick={() => setSelectedFriendId(myProfile.id)} className={`flex flex-col items-center min-w-[50px] ${selectedFriendId === myProfile.id ? 'opacity-100' : 'opacity-60'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 transition-all ${selectedFriendId === myProfile.id ? "border-primary bg-primary/10" : "border-transparent bg-gray-100"}`}>
                        {myProfile.avatar}
                    </div>
                    <span className={`text-xs mt-1 ${selectedFriendId === myProfile.id ? "font-bold text-primary" : "text-gray-500"}`}>나</span>
                </button>
            )}
            {friendList.map(friend => (
                <button key={friend.id} onClick={() => setSelectedFriendId(friend.id)} className={`flex flex-col items-center min-w-[50px] ${selectedFriendId === friend.id ? 'opacity-100' : 'opacity-60'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 transition-all ${selectedFriendId === friend.id ? "border-primary bg-primary/10" : "border-transparent bg-gray-100"}`}>
                        {friend.avatar}
                    </div>
                    <span className={`text-xs mt-1 ${selectedFriendId === friend.id ? "font-bold text-primary" : "text-gray-500"}`}>{friend.name.split('(')[0]}</span>
                </button>
            ))}
      </div>

      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500"/> 다가오는 일정</h2>
            <div className="space-y-2">
                {upcomingList.length === 0 && <div className="text-center py-6 text-gray-400 bg-white rounded-xl border border-dashed text-sm">일정이 없습니다.</div>}
                {upcomingList.map(event => (
                    <Card key={event.id} onClick={() => openEditModal(event)} className="cursor-pointer hover:bg-slate-50 border-l-4 border-l-blue-500 transition-all shadow-sm hover:shadow-md">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div><h4 className="font-bold text-base">{event.title}</h4><p className="text-xs text-gray-500 mt-1">{event.date} {event.time} · {event.location_name || '장소 미정'}</p></div>
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
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-500">제목</label><Input placeholder="일정 제목" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500">날짜</label><Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500">시간</label><Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} /></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">카테고리</label>
                            <select className="w-full h-10 px-3 border rounded-md text-sm bg-white" value={formData.purpose} onChange={e => handlePurposeChange(e.target.value)}>
                                {purposeOptions.map((p: string) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">소요 시간 (시간)</label>
                            <Input type="number" step="0.5" min="0.5" value={formData.duration_hours} onChange={e => setFormData({...formData, duration_hours: parseFloat(e.target.value)})} />
                        </div>
                    </div>

                    <div className="space-y-1"><label className="text-xs font-bold text-gray-500">장소</label><Input placeholder="장소 (선택)" value={formData.location_name || ''} onChange={e => setFormData({...formData, location_name: e.target.value})} /></div>
                    <div className="flex gap-2 pt-2">
                        {isEditing && (<Button variant="destructive" className="w-12 bg-red-500 hover:bg-red-600 text-white" onClick={() => handleDelete((formData as Event).id!)}><Trash2 className="w-4 h-4"/></Button>)}
                        <Button className="flex-1 font-bold" onClick={handleSubmit}>{isEditing ? "수정 완료" : "등록하기"}</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  )
}