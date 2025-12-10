"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Check, Search, MapPin, User, X, Plus, Trash2, Users, ChevronDown, ChevronUp, Filter, Share, Heart, MessageSquare, Locate, Loader2, Coins, Gem } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { motion, AnimatePresence } from "framer-motion" 

import { PreferenceModal } from "@/components/ui/preference-modal"
import { PlaceCard } from "@/components/ui/place-card"
import { fetchWithAuth } from "@/lib/api-client"

declare global { interface Window { naver: any; } }

const AI_PERSONAS = [
    { id: 2, name: "김직장 (강남)", locationName: "강남역", location: { lat: 37.498085, lng: 127.027621 }, desc: "퇴근 후 한잔", avatar: { equipped: { body: "body_basic" } } },
    { id: 3, name: "이대학 (홍대)", locationName: "홍대입구", location: { lat: 37.557527, lng: 126.924467 }, desc: "가성비 맛집", avatar: { equipped: { body: "body_basic" } } },
    { id: 4, name: "박감성 (성수)", locationName: "성수역", location: { lat: 37.544581, lng: 127.056035 }, desc: "분위기 카페", avatar: { equipped: { body: "body_basic" } } },
];

const PURPOSE_FILTERS: Record<string, any> = {
    "식사": { label: "🍚 식사", tabs: { "MENU": { label: "메뉴", options: ["한식", "양식", "일식", "중식", "고기", "분식"] }, "VIBE": { label: "분위기", options: ["가성비", "혼밥", "깔끔한", "웨이팅맛집"] } } },
    "술/회식": { label: "🍺 술/회식", tabs: { "TYPE": { label: "주종", options: ["소주", "맥주", "와인", "하이볼"] }, "VIBE": { label: "분위기", options: ["시끌벅적", "조용한", "힙한", "노포"] } } },
    "카페": { label: "☕ 카페", tabs: { "TYPE": { label: "목적", options: ["수다", "작업", "디저트"] }, "VIBE": { label: "분위기", options: ["감성", "뷰맛집", "대형"] } } },
    "데이트/기념일": { label: "💖 데이트", tabs: { "COURSE": { label: "코스", options: ["맛집", "카페", "산책", "액티비티"] }, "VIBE": { label: "분위기", options: ["로맨틱", "조용한", "이색적인"] } } }
};

const API_URL = "https://wemeet-backend-xqlo.onrender.com";

export function HomeTab() {
  const router = useRouter();
  
  // --- State ---
  const [searchQuery, setSearchQuery] = useState("")
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null)
  const [myLocationInput, setMyLocationInput] = useState("위치 확인 중...")
  
  const [manualInputs, setManualInputs] = useState<string[]>([""]); 
  const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
  const [includeMe, setIncludeMe] = useState(true);

  const [recommendations, setRecommendations] = useState<any[]>([])
  const [currentDisplayRegion, setCurrentDisplayRegion] = useState<any>(null)
  const [activeTabIdx, setActiveTabIdx] = useState(0)
  
  const [loots, setLoots] = useState<any[]>([]) 
  const [loading, setLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string>("");

  const [nearbyPlace, setNearbyPlace] = useState<any>(null); 
  const [nearbyLoot, setNearbyLoot] = useState<any>(null);   
  const [interactionLoading, setInteractionLoading] = useState(false);

  // Modal State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [isPreferenceModalOpen, setIsPreferenceModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter State
  const [selectedPurpose, setSelectedPurpose] = useState("식사")
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({ PURPOSE: ["식사"], CATEGORY: [], PRICE: [], VIBE: [], CONDITION: [] });
  const [myProfile, setMyProfile] = useState<any>(null)

  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const lootMarkersRef = useRef<any[]>([])

  // 거리 계산
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3; 
      const φ1 = lat1 * Math.PI/180;
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2-lat1) * Math.PI/180;
      const Δλ = (lon2-lon1) * Math.PI/180;
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
  }

  // 초기 데이터 로드
  useEffect(() => {
      const fetchMyInfo = async () => {
          const token = localStorage.getItem("token");
          if (!token) { setMyLocationInput("비회원"); return; }
          try {
              const res = await fetchWithAuth("/api/users/me");
              if (res.ok) {
                  const user = await res.json();
                  setMyProfile({ ...user, locationName: "현위치" });
                  setMyLocationInput("📍 현위치 (GPS)");
                  if (!user.preferences?.foods || user.preferences.foods.length === 0) setIsPreferenceModalOpen(true);
                  if (user.location) fetchLoots(user.location.lat, user.location.lng);
              }
          } catch (e) { console.error(e); }
      }
      fetchMyInfo();
  }, []);

  // 보물 생성
  const fetchLoots = async (lat: number, lng: number) => {
      try {
          const res = await fetchWithAuth("/api/coins/map-loot", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat, lng })
          });
          if (res.ok) setLoots(await res.json());
      } catch (e) {}
  }

  // 위치 추적 및 상호작용 체크
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
        (pos) => {
            setGpsError("");
            const { latitude, longitude } = pos.coords;
            const currentPos = { lat: latitude, lng: longitude };
            setMyLocation(currentPos);
            
            // 방문 인증 (500m)
            if (currentDisplayRegion?.places?.length > 0) {
                let foundPlace = null;
                for (const place of currentDisplayRegion.places) {
                    const dist = calculateDistance(latitude, longitude, place.location[0], place.location[1]);
                    if (dist <= 500) { foundPlace = place; break; }
                }
                setNearbyPlace(foundPlace);
            }
            // 보물 줍기 (50m)
            if (loots.length > 0) {
                let foundLoot = null;
                for (const loot of loots) {
                    const dist = calculateDistance(latitude, longitude, loot.lat, loot.lng);
                    if (dist <= 50) { foundLoot = loot; break; }
                }
                setNearbyLoot(foundLoot);
            }
        },
        (err) => setGpsError("위치 정보를 가져올 수 없습니다."),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [currentDisplayRegion, loots]);

  // 지도 그리기
  useEffect(() => {
    const initMap = () => {
      if (typeof window.naver === 'undefined' || !window.naver.maps) { setTimeout(initMap, 100); return; }
      const center = myLocation || { lat: 37.5665, lng: 126.9780 };
      if (!mapRef.current) {
        mapRef.current = new window.naver.maps.Map("map", { center: new window.naver.maps.LatLng(center.lat, center.lng), zoom: 16 }); 
      }

      // 1. 내 위치
      if (myLocation) {
          new window.naver.maps.Marker({
              position: new window.naver.maps.LatLng(myLocation.lat, myLocation.lng),
              map: mapRef.current, zIndex: 100,
              icon: { content: '<div style="font-size:30px;">🏃</div>' }
          });
      }

      // 2. 추천 장소 마커
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      if (currentDisplayRegion?.places) {
          currentDisplayRegion.places.forEach((p: any) => {
              const marker = new window.naver.maps.Marker({ 
                  position: new window.naver.maps.LatLng(p.location[0], p.location[1]), 
                  map: mapRef.current, title: p.name
              });
              markersRef.current.push(marker);
          });
          // 지도 이동
          if (currentDisplayRegion.places.length > 0) {
             mapRef.current.morph(new window.naver.maps.LatLng(currentDisplayRegion.lat, currentDisplayRegion.lng));
          }
      }

      // 3. 보물 마커
      lootMarkersRef.current.forEach(m => m.setMap(null));
      lootMarkersRef.current = [];
      loots.forEach((loot) => {
          const marker = new window.naver.maps.Marker({
              position: new window.naver.maps.LatLng(loot.lat, loot.lng),
              map: mapRef.current,
              icon: { content: '<div style="font-size:24px; animation: bounce 2s infinite;">💎</div>' }
          });
          lootMarkersRef.current.push(marker);
      });
    };
    initMap();
  }, [myLocation, currentDisplayRegion, loots]);

  // 🌟 [핵심 수정] 추천 요청 로직 강화
  const fetchRecommendations = async (participants: any[], manualLocs: string[]) => {
    setLoading(true);
    try {
      const allTags = Object.values(selectedFilters).flat();
      
      // 1. 사용자 정보 포맷팅
      const usersToSend = participants.map(u => ({
        id: u.id || 0,
        name: u.name || "User",
        location: u.location || { lat: 37.5665, lng: 126.9780 },
        preferences: u.preferences || {}
      }));

      // 2. 유효한 수동 입력만 필터링
      const validManualLocs = manualLocs.filter(loc => loc && loc.trim() !== "");

      console.log("Sending Request:", { users: usersToSend, manual_locations: validManualLocs, purpose: selectedPurpose });

      const response = await fetch(`${API_URL}/api/recommend`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: usersToSend, 
          purpose: selectedPurpose, 
          location_name: "중간지점", // 모드 명시
          manual_locations: validManualLocs, 
          user_selected_tags: allTags,
          // 내 위치 정보도 함께 전송 (참여자 없을 때 사용됨)
          current_lat: myProfile?.location?.lat || 37.5665,
          current_lng: myProfile?.location?.lng || 126.9780
        })
      })

      if (response.ok) {
          const data = await response.json() as any[];
          console.log("Response:", data);
          setRecommendations(data);
          setActiveTabIdx(0); 
          setIsExpanded(false);
          if (data.length > 0) {
              setCurrentDisplayRegion(data[0]);
              // 추천 지역 주변에 보물 생성
              if(data[0].lat && data[0].lng) fetchLoots(data[0].lat, data[0].lng);
          }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // 🌟 [핵심 수정] 중간 지점 찾기 버튼 핸들러
  const handleMidpointSearch = () => {
      let participants = [...selectedFriends];
      if (includeMe && myProfile) {
          participants = [myProfile, ...selectedFriends];
      }

      // 입력값이 하나라도 있는지 검사
      const hasManualInput = manualInputs.some(txt => txt && txt.trim() !== "");
      if (participants.length === 0 && !hasManualInput) { 
          alert("출발지를 설정해주세요! (내 위치, 친구, 또는 장소 입력)"); 
          return; 
      }

      fetchRecommendations(participants, manualInputs);
  };

  const handleManualInputChange = (idx: number, val: string) => { 
      const newInputs = [...manualInputs]; 
      newInputs[idx] = val; 
      setManualInputs(newInputs); 
  };
  
  // 기타 핸들러들
  const addManualInput = () => setManualInputs([...manualInputs, ""]);
  const removeManualInput = (idx: number) => setManualInputs(manualInputs.filter((_, i) => i !== idx));
  const toggleFriend = (friend: any) => { 
      if (selectedFriends.find(f => f.id === friend.id)) setSelectedFriends(prev => prev.filter(f => f.id !== friend.id)); 
      else setSelectedFriends(prev => [...prev, friend]); 
  };
  const toggleFilter = (k: string, v: string) => {
      setSelectedFilters(prev => {
          if (k === "PURPOSE") return { ...prev, [k]: [v] };
          const list = prev[k] || [];
          return list.includes(v) ? { ...prev, [k]: list.filter(i => i !== v) } : { ...prev, [k]: [...list, v] };
      });
  };
  const handleCheckIn = async () => {
      if (!nearbyPlace) return;
      setInteractionLoading(true);
      try {
          await fetchWithAuth("/api/coins/check-in", { method: "POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({place_name:nearbyPlace.name, lat:nearbyPlace.location[0], lng:nearbyPlace.location[1]}) });
          alert("50코인 획득!"); setNearbyPlace(null);
      } catch(e) { alert("오류"); } finally { setInteractionLoading(false); }
  }
  const handleClaimLoot = async () => {
      if (!nearbyLoot) return;
      setInteractionLoading(true);
      try {
          await fetchWithAuth("/api/coins/claim-loot", { method: "POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({loot_id:nearbyLoot.id, amount:nearbyLoot.amount}) });
          alert(`${nearbyLoot.amount}코인 획득!`); setLoots(p=>p.filter(l=>l.id!==nearbyLoot.id)); setNearbyLoot(null);
      } catch(e) { alert("오류"); } finally { setInteractionLoading(false); }
  }

  const currentFilters = PURPOSE_FILTERS[selectedPurpose];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col bg-[#F3F4F6] relative font-['Pretendard']">
      
      {/* 상단 검색바 */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="flex items-center bg-white rounded-2xl shadow-md h-12 px-4 border border-gray-100">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <Input className="border-none bg-transparent h-full text-base p-0" placeholder="빠른 장소 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto mt-2 pb-1 scrollbar-hide">
            <Button variant="outline" size="sm" className="rounded-full bg-white shadow-sm border-[#7C3AED] text-[#7C3AED]" onClick={() => setIsFilterOpen(true)}><Filter className="w-3 h-3 mr-1"/>필터</Button>
            <Badge className="rounded-full bg-gradient-to-r from-[#7C3AED] to-[#14B8A6] border-0 text-white h-9 px-3 flex items-center">{currentFilters?.label}</Badge>
        </div>
      </div>

      <div id="map" className="w-full h-full bg-gray-200"></div>

      {/* 상호작용 버튼 */}
      <AnimatePresence>
        {nearbyLoot ? (
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="absolute bottom-24 left-4 right-4 z-30">
                <Button onClick={handleClaimLoot} disabled={interactionLoading} className="w-full h-14 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-xl animate-pulse flex gap-2"><Gem className="w-5 h-5"/> 보물 줍기 (+{nearbyLoot.amount}C)</Button>
            </motion.div>
        ) : nearbyPlace ? (
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="absolute bottom-24 left-4 right-4 z-30">
                <Button onClick={handleCheckIn} disabled={interactionLoading} className="w-full h-14 rounded-2xl bg-yellow-500 hover:bg-yellow-600 text-white font-bold shadow-xl animate-bounce flex gap-2"><Coins className="w-5 h-5"/> 방문 인증 (+50C)</Button>
            </motion.div>
        ) : null}
      </AnimatePresence>

      {/* 출발지 설정 카드 (기본 표시) */}
      {!recommendations.length && (
          <div className="absolute bottom-4 left-4 right-4 bg-white rounded-3xl p-5 shadow-lg border border-gray-100 z-20">
            <h2 className="text-lg font-bold mb-3">어디서 모이나요?</h2>
            <div className="space-y-2 max-h-40 overflow-y-auto">
                {includeMe && <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl"><span className="text-xl">👤</span><span className="flex-1 text-sm">{myLocationInput}</span><button onClick={()=>setIncludeMe(false)}><Trash2 className="w-4 h-4 text-gray-400"/></button></div>}
                {selectedFriends.map(f => <div key={f.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl"><Avatar className="w-8 h-8"><AvatarFallback>{f.name[0]}</AvatarFallback></Avatar><span className="flex-1 text-sm">{f.name}</span><button onClick={()=>toggleFriend(f)}><X className="w-4 h-4 text-gray-400"/></button></div>)}
                {manualInputs.map((val, i) => <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl"><MapPin className="w-5 h-5 text-gray-400"/><div className="flex-1"><PlaceAutocomplete value={val} onChange={(v)=>handleManualInputChange(i, v)} placeholder="장소 입력 (예: 강남역)"/></div><button onClick={()=>removeManualInput(i)}><Trash2 className="w-4 h-4 text-gray-400"/></button></div>)}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
                <Button variant="outline" onClick={() => setIsFriendModalOpen(true)}><Users className="w-4 h-4 mr-2"/>친구</Button>
                <Button variant="outline" onClick={addManualInput}><Plus className="w-4 h-4 mr-2"/>장소</Button>
            </div>
            {!includeMe && <button onClick={()=>setIncludeMe(true)} className="text-xs text-gray-500 mt-2 underline w-full">+ 내 위치 추가</button>}
            <Button className="w-full mt-3 h-12 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold" onClick={handleMidpointSearch}>🚀 중간 지점 찾기</Button>
          </div>
      )}

      {/* 추천 결과 리스트 */}
      <AnimatePresence>
        {recommendations.length > 0 && (
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] max-h-[50%] overflow-y-auto z-20">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4"/>
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">추천 핫플레이스</h3><button onClick={()=>{setRecommendations([]); setManualInputs([""]);}} className="text-xs text-gray-400">다시 찾기</button></div>
                <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">{recommendations.map((r, i) => <button key={i} onClick={()=>{setActiveTabIdx(i); setCurrentDisplayRegion(r);}} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${activeTabIdx===i?"bg-[#7C3AED] text-white":"bg-gray-100 text-gray-500"}`}>{r.region_name}</button>)}</div>
                <div className="space-y-3">{currentDisplayRegion?.places?.map((p: any) => <PlaceCard key={p.id} place={p} onClick={()=>setSelectedPlace(p)}/>)}</div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {loading && <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center"><Loader2 className="w-10 h-10 text-[#7C3AED] animate-spin"/></div>}
      
      {/* GPS Error */}
      {gpsError && <div className="absolute top-20 left-4 right-4 bg-red-100 text-red-600 p-2 rounded-lg text-xs z-50">{gpsError}</div>}

      {/* Modals */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}><DialogContent><DialogHeader><DialogTitle>필터 설정</DialogTitle></DialogHeader><div className="flex flex-wrap gap-2">{Object.keys(PURPOSE_FILTERS).map(k=><Button key={k} variant={selectedPurpose===k?"default":"outline"} onClick={()=>setSelectedPurpose(k)}>{k}</Button>)}</div></DialogContent></Dialog>
      <Dialog open={isFriendModalOpen} onOpenChange={setIsFriendModalOpen}><DialogContent><DialogHeader><DialogTitle>친구 추가</DialogTitle></DialogHeader><div className="space-y-2">{AI_PERSONAS.map(f=><div key={f.id} onClick={()=>toggleFriend(f)} className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer border rounded-lg"><Avatar><AvatarFallback>{f.name[0]}</AvatarFallback></Avatar><div><div className="font-bold">{f.name}</div><div className="text-xs text-gray-500">{f.locationName}</div></div>{selectedFriends.find(sf=>sf.id===f.id)&&<Check className="ml-auto w-4 h-4 text-purple-600"/>}</div>)}</div></DialogContent></Dialog>
      <PreferenceModal isOpen={isPreferenceModalOpen} onClose={()=>setIsPreferenceModalOpen(false)} onComplete={()=>setIsPreferenceModalOpen(false)}/>
    </motion.div>
  )
}

function PlaceAutocomplete({ value, onChange, placeholder }: any) {
    const [list, setList] = useState<any[]>([]);
    useEffect(() => {
        if(value.length < 1) { setList([]); return; }
        const t = setTimeout(async() => {
            try { const res = await fetch(`${API_URL}/api/places/search?query=${value}`); if(res.ok) setList(await res.json()); } catch(e){}
        }, 300);
        return () => clearTimeout(t);
    }, [value]);
    return (
        <div className="relative w-full">
            <Input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm bg-transparent border-none p-0 focus-visible:ring-0"/>
            {list.length > 0 && <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">{list.map((item, i) => <div key={i} onClick={()=>{onChange(item.title); setList([])}} className="p-2 hover:bg-gray-100 cursor-pointer text-sm">{item.title}</div>)}</div>}
        </div>
    )
}