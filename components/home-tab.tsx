"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { MapPin, Target, ChevronDown, Sparkles, Check, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

declare global { interface Window { naver: any; } }

// --- 데이터 ---
const MY_ID = 1
const FRIENDS_DB = [
  { id: 1, name: "나(안암)", avatar: "👤", location: { lat: 37.586, lng: 127.029 }, favorites: [104, 105] },
  { id: 2, name: "클레오(홍대)", avatar: "👦", location: { lat: 37.557, lng: 126.924 }, favorites: [103] },
  { id: 3, name: "벤지(강남)", avatar: "🧑", location: { lat: 37.498, lng: 127.027 }, favorites: [104, 105] },
  { id: 4, name: "로건(성수)", avatar: "👧", location: { lat: 37.544, lng: 127.056 }, favorites: [101] },
]

const HOT_PLACES = [
  { name: "을지로", lat: 37.566, lng: 126.991 }, { name: "종로", lat: 37.571, lng: 126.985 },
  { name: "약수", lat: 37.551, lng: 127.011 }, { name: "명동", lat: 37.561, lng: 126.985 },
  { name: "동대문", lat: 37.571, lng: 127.009 }, { name: "신촌", lat: 37.555, lng: 126.937 },
  { name: "한남동", lat: 37.536, lng: 127.011 }, { name: "이태원", lat: 37.534, lng: 126.994 },
  { name: "성수", lat: 37.544, lng: 127.056 }, { name: "강남", lat: 37.498, lng: 127.027 }
];

// 거리 계산 함수
const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
};

// [수정] 중간 지점 3개 후보군 계산
const calculateCandidates = (friendIds: number[]) => {
  const members = FRIENDS_DB.filter(u => u.id === MY_ID || friendIds.includes(u.id))
  const midLat = members.reduce((sum, m) => sum + m.location.lat, 0) / members.length
  const midLng = members.reduce((sum, m) => sum + m.location.lng, 0) / members.length

  // 거리순 정렬하여 상위 3개 반환
  const sortedPlaces = HOT_PLACES.map(p => ({
    ...p, dist: getDistance(midLat, midLng, p.lat, p.lng)
  })).sort((a, b) => a.dist - b.dist).slice(0, 3)

  return sortedPlaces;
}

// 목적별 필터 옵션 (기존 유지)
const FILTER_OPTIONS: any = {
  meal: { label: "식사", groups: [{ id: 'type', options: ["한식", "양식", "일식", "중식", "고기/구이"] }, { id: 'price', options: ["가성비", "보통", "고급"] }, { id: 'vibe', options: ["조용한", "시끌벅적", "노포감성"] }] },
  business: { label: "비즈니스", groups: [{ id: 'activity', options: ["회의/워크샵", "식사/접대", "티타임"] }, { id: 'facility', options: ["룸", "주차편한", "역세권"] }] },
  date: { label: "데이트", groups: [{ id: 'type', options: ["맛집", "카페", "술/와인", "문화/산책"] }, { id: 'vibe', options: ["로맨틱", "야경/뷰", "이색적인"] }] },
  drinking: { label: "술/회식", groups: [{ id: 'type', options: ["이자카야", "포차", "와인"] }, { id: 'vibe', options: ["시끌벅적", "조용한"] }] },
  study: { label: "스터디", groups: [] },
  cafe: { label: "카페", groups: [{ id: 'type', options: ["디저트", "베이커리", "대형카페"] }, { id: 'vibe', options: ["카공/작업", "대화하기좋은", "감성"] }] }
}

export function HomeTab() {
  const [selectedPurpose, setSelectedPurpose] = useState("meal")
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  // [핵심] 후보군 3개와 현재 선택된 지역 관리
  const [candidates, setCandidates] = useState(calculateCandidates([]))
  const [selectedRegion, setSelectedRegion] = useState(candidates[0])

  const [places, setPlaces] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  // 1. 친구 변경 시 후보군 재계산 및 1순위 자동 선택
  useEffect(() => {
    const newCandidates = calculateCandidates(selectedFriendIds)
    setCandidates(newCandidates)
    setSelectedRegion(newCandidates[0]) // 가장 가까운 곳 자동 선택
  }, [selectedFriendIds])

  // 2. 지도 초기화
  useEffect(() => {
    const initMap = () => {
      if (typeof window.naver === 'undefined' || !window.naver.maps) {
        setTimeout(initMap, 100); return;
      }
      if (!mapRef.current) {
        mapRef.current = new window.naver.maps.Map("map", {
          center: new window.naver.maps.LatLng(selectedRegion.lat, selectedRegion.lng),
          zoom: 14
        });
      }
    };
    setTimeout(initMap, 100);
  }, []);

  // 3. [핵심] 지역 변경 시 지도 이동 (Sync)
  useEffect(() => {
    if (mapRef.current && window.naver) {
      const newCenter = new window.naver.maps.LatLng(selectedRegion.lat, selectedRegion.lng)
      mapRef.current.morph(newCenter)
    }
  }, [selectedRegion]) // selectedRegion이 바뀔 때마다 실행

  // 4. 마커 업데이트
  useEffect(() => {
    if (!mapRef.current || !window.naver) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    places.forEach(p => {
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(p.location[0], p.location[1]),
        map: mapRef.current,
        title: p.name
      });
      markersRef.current.push(marker);
    });
  }, [places]);

  // 5. API 호출 (선택된 지역 기반)
  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://127.0.0.1:8000/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: FRIENDS_DB.filter(u => u.id === MY_ID || selectedFriendIds.includes(u.id)).map(u => ({ id: u.id, name: u.name, history_poi_ids: u.favorites })),
          purpose: selectedPurpose,
          location_name: selectedRegion.name, // [중요] 선택된 지역명 전송
          current_lat: selectedRegion.lat,    // [중요] 선택된 지역 좌표 전송
          current_lng: selectedRegion.lng,
          user_selected_tags: selectedTags
        })
      })
      if (response.ok) setPlaces(await response.json())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  // 조건 변경 시 자동 검색
  useEffect(() => {
    fetchRecommendations()
  }, [selectedRegion, selectedPurpose, selectedTags])

  // 핸들러
  const toggleFriend = (id: number) => {
    if (selectedFriendIds.includes(id)) setSelectedFriendIds(prev => prev.filter(fid => fid !== id))
    else setSelectedFriendIds(prev => [...prev, id])
  }
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) setSelectedTags(prev => prev.filter(t => t !== tag))
    else setSelectedTags(prev => [...prev, tag])
  }

  const currentOptions = FILTER_OPTIONS[selectedPurpose] || FILTER_OPTIONS['meal']

  return (
    <div className="h-full overflow-y-auto pb-20 bg-background">
      {/* 친구 선택 */}
      <div className="px-4 pt-6 pb-3 sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <h1 className="text-xl font-bold mb-2">누구와 만나시나요?</h1>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex flex-col items-center min-w-[50px]"><div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl mb-1">👤</div><span className="text-xs font-bold">나</span></div>
          {FRIENDS_DB.filter(u => u.id !== MY_ID).map(f => (
            <button key={f.id} onClick={() => toggleFriend(f.id)} className="flex flex-col items-center min-w-[50px]">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mb-1 transition-all ${selectedFriendIds.includes(f.id) ? "bg-primary text-white shadow-lg scale-110" : "bg-muted grayscale"}`}>{selectedFriendIds.includes(f.id) ? <Check className="w-6 h-6"/> : f.avatar}</div>
              <span className="text-xs">{f.name.split('(')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* [UI 수정] 지역 선택 칩 (3개 후보) */}
      <div className="px-4 py-3">
        <p className="text-xs text-muted-foreground mb-2">추천 중간 지점 (클릭하여 이동)</p>
        <div className="flex gap-2">
          {candidates.map(region => (
            <Button 
              key={region.name} 
              variant={selectedRegion.name === region.name ? "default" : "outline"} 
              className="flex-1 text-xs h-8" 
              onClick={() => setSelectedRegion(region)}
            >
              {region.name}
            </Button>
          ))}
        </div>
      </div>

      {/* 목적 및 태그 필터 */}
      <div className="px-4 py-0 space-y-3">
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2"><Target className="w-4 h-4 text-primary"/>{currentOptions.label}<ChevronDown className="w-4 h-4"/></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(FILTER_OPTIONS).map(([k, v]: any) => <DropdownMenuItem key={k} onClick={() => setSelectedPurpose(k)}>{v.label}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex-1 overflow-x-auto flex gap-2 scrollbar-hide">
            {currentOptions.groups.flatMap((g: any) => g.options).map((tag: string) => (
              <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${selectedTags.includes(tag) ? "bg-secondary border-secondary text-secondary-foreground" : "bg-white border-gray-200"}`}>{tag}</button>
            ))}
          </div>
        </div>
      </div>

      {/* 지도 & 리스트 */}
      <div className="px-4 py-3">
        <div className="relative h-56 rounded-xl overflow-hidden border mb-4 shadow-sm">
            <div id="map" className="w-full h-full bg-muted"></div>
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow text-primary border border-primary/20">
             📍 {places.length}개의 추천 장소
           </div>
        </div>
        
        <h2 className="text-lg font-bold mb-3">{loading ? "AI 분석 중..." : `추천 장소 ${places.length}곳`}</h2>
        <div className="space-y-3">
          {places.map(p => (
            <Card key={p.id} className="p-3 flex gap-3 hover:border-primary cursor-pointer transition-colors">
              <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-2xl">{p.category === 'cafe' ? '☕' : '🍽️'}</div>
              <div className="flex-1">
                <div className="flex justify-between"><h3 className="font-bold text-sm">{p.name}</h3><Badge variant="secondary" className="text-xs">{(p.score*10).toFixed(0)}%</Badge></div>
                <p className="text-xs text-muted-foreground mb-1">{p.category} · {selectedRegion.name}</p>
                <div className="flex gap-1 flex-wrap">
                    {p.tags.slice(0, 3).map((t: string, i: number) => <Badge key={i} variant="outline" className="text-[10px] px-1 py-0 h-5">{t}</Badge>)}
                </div>
              </div>
            </Card>
          ))}
          {!loading && places.length === 0 && <div className="text-center py-10 text-muted-foreground">조건에 맞는 장소가 없어요.</div>}
        </div>
      </div>
    </div>
  )
}