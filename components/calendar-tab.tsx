"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Event { id?: string; user_id: number; title: string; date: string; time: string; duration_hours: number; location_name?: string; purpose: string; }
const FRIENDS = [{ id: 1, name: "나", avatar: "👤", allowed: true }, { id: 2, name: "클레오", avatar: "👦", allowed: true }, { id: 3, name: "벤지", avatar: "🧑", allowed: false }, { id: 4, name: "로건", avatar: "👧", allowed: true }];
const INITIAL_EVENT: Omit<Event, 'id'> = { user_id: 1, title: '', date: new Date().toISOString().split('T')[0], time: '19:00', duration_hours: 1.5, purpose: 'meal', location_name: '' };

export function CalendarTab() {
  const [events, setEvents] = useState<Event[]>([])
  const [currentDate, setCurrentDate] = useState(new Date()) 
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Event | Omit<Event, 'id'>>(INITIAL_EVENT)
  const [isEditing, setIsEditing] = useState(false) 
  const [selectedFriendId, setSelectedFriendId] = useState<number>(1);
  const [isFullCalendarOpen, setIsFullCalendarOpen] = useState(false);
  const purposeOptions = ['meal', 'date', 'business', 'drinking', 'study', 'cafe']

  const fetchEvents = async () => { try { const res = await fetch('http://127.0.0.1:8000/api/events'); if (res.ok) setEvents(await res.json()); } catch (e) { console.error(e); } }
  const handleSubmit = async () => {
    if (!formData.title) return alert("제목 필수");
    const url = isEditing && (formData as Event).id ? `http://127.0.0.1:8000/api/events/${(formData as Event).id}` : 'http://127.0.0.1:8000/api/events';
    const method = isEditing ? 'PUT' : 'POST';
    try { const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }); if (res.ok) { fetchEvents(); setShowForm(false); } } catch (e) { alert('Error'); }
  }
  const handleDelete = async (id: string) => { if (confirm('삭제?')) { await fetch(`http://127.0.0.1:8000/api/events/${id}`, { method: 'DELETE' }); fetchEvents(); setShowForm(false); } }
  
  const openEditModal = (event: Event) => { setFormData(event); setIsEditing(true); setShowForm(true); }
  const openCreateModal = () => { setFormData({ ...INITIAL_EVENT, user_id: selectedFriendId }); setIsEditing(false); setShowForm(true); }

  useEffect(() => { fetchEvents() }, [])
  
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

  const upcomingList = filteredEvents.filter(e => new Date(e.date + ' ' + e.time) >= new Date()).sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime()).slice(0, 3);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="sticky top-0 z-10 bg-white border-b p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">일정</h1>
        <Button size="sm" onClick={openCreateModal}><Plus className="w-4 h-4 mr-1"/> 추가</Button>
      </div>
      
      <div className="px-4 py-3 bg-white border-b flex gap-3 overflow-x-auto scrollbar-hide">
            {FRIENDS.map(friend => (
                <button key={friend.id} onClick={() => friend.allowed ? setSelectedFriendId(friend.id) : alert("비공개")} className="flex flex-col items-center min-w-[50px]">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 transition-all ${selectedFriendId === friend.id ? "border-primary bg-primary/10" : "border-transparent bg-gray-100"}`}>{friend.avatar}</div>
                    <span className={`text-xs mt-1 ${selectedFriendId === friend.id ? "font-bold text-primary" : "text-gray-500"}`}>{friend.name}</span>
                </button>
            ))}
      </div>

      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500"/> 다가오는 일정</h2>
            <div className="space-y-2">
                {upcomingList.map(event => (
                    <Card key={event.id} onClick={() => openEditModal(event)} className="cursor-pointer hover:bg-slate-50 border-l-4 border-l-blue-500 transition-all shadow-sm hover:shadow-md">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div><h4 className="font-bold text-base">{event.title}</h4><p className="text-xs text-gray-500 mt-1">{event.date} {event.time} · {event.location_name || '장소 미정'}</p></div>
                            <Badge variant="secondary" className="px-3 py-1">{event.purpose.toUpperCase()}</Badge>
                        </CardContent>
                    </Card>
                ))}
                {upcomingList.length === 0 && <div className="text-center py-6 text-gray-400 bg-white rounded-xl border border-dashed text-sm">일정이 없습니다.</div>}
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
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-500">카테고리</label><select className="w-full h-10 px-3 border rounded-md text-sm bg-white" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value as any})}>{purposeOptions.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-500">장소</label><Input placeholder="장소 (선택)" value={formData.location_name || ''} onChange={e => setFormData({...formData, location_name: e.target.value})} /></div>
                    <div className="flex gap-2 pt-2">
                        {isEditing && <Button variant="destructive" className="w-12" onClick={() => handleDelete((formData as Event).id!)}><Trash2 className="w-4 h-4"/></Button>}
                        <Button className="flex-1 font-bold" onClick={handleSubmit}>{isEditing ? "수정 완료" : "등록하기"}</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  )
}