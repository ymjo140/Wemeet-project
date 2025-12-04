"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog" // DialogTitle import 필수
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ChevronRight, ChevronLeft, Check, ThumbsDown, Wine, Car, DollarSign, Sparkles } from "lucide-react"

const OPTIONS = {
  foods: ["한식", "일식", "중식", "양식", "아시안", "고기/구이", "해산물/회", "분식", "패스트푸드", "카페/디저트"],
  dislikes: ["매운것", "날것(회)", "오이", "고수", "곱창/내장", "유제품", "갑각류", "견과류", "없음"],
  vibes: ["조용한", "시끌벅적", "힙한", "감성적인", "뷰맛집", "노포감성", "고급진", "프라이빗(룸)", "깨끗한", "이색적인"],
  alcohol: ["소주", "맥주", "와인", "위스키/하이볼", "막걸리/전통주", "술 안 마심"],
  conditions: ["주차가능", "발렛파킹", "콜키지프리", "단체석", "노키즈존", "반려동물동반", "예약필수", "24시간"],
}

export function PreferenceModal({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave: () => void }) {
  const [step, setStep] = useState(1)
  const totalSteps = 4
  const [foods, setFoods] = useState<string[]>([])
  const [dislikes, setDislikes] = useState<string[]>([])
  const [vibes, setVibes] = useState<string[]>([])
  const [alcohol, setAlcohol] = useState<string[]>([])
  const [conditions, setConditions] = useState<string[]>([])
  const [avgSpend, setAvgSpend] = useState<number>(20000)

  const toggleItem = (list: string[], setList: any, item: string) => {
    if (list.includes(item)) setList(list.filter(i => i !== item))
    else setList([...list, item])
  }

  const handleSave = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const res = await fetch("https://wemeet-backend-xqlo.onrender.com/api/users/me/preferences", {
        method: "PUT",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            foods, dislikes, vibes, alcohol, conditions, avg_spend: avgSpend
        })
      })

      if (res.ok) {
          onSave()
          onClose()
      } else {
          alert("저장 중 오류가 발생했습니다.")
      }
    } catch (e) { console.error(e) }
  }

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps))
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl" onInteractOutside={(e) => e.preventDefault()}>
        
        {/* 👇 [추가됨] 접근성 에러 해결을 위한 숨겨진 제목 */}
        <DialogTitle className="sr-only">취향 설정</DialogTitle>

        {/* 상단 진행바 */}
        <div className="bg-gray-50 p-6 pb-2">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-primary">STEP {step} / {totalSteps}</span>
                <span className="text-xs text-gray-400">AI 맞춤 분석 중...</span>
            </div>
            <Progress value={(step / totalSteps) * 100} className="h-2" />
            <div className="mt-4">
                <h2 className="text-xl font-bold">
                    {step === 1 && "어떤 음식을 좋아하시나요? 🍽️"}
                    {step === 2 && "선호하는 분위기는요? ✨"}
                    {step === 3 && "술이나 못 드시는 게 있나요? 🍷"}
                    {step === 4 && "예산과 필수 조건은요? 💰"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {step === 1 && "자주 찾는 메뉴를 모두 선택해주세요."}
                    {step === 2 && "약속 장소를 고를 때 가장 중요하게 보는 분위기입니다."}
                    {step === 3 && "AI가 센스 있게 메뉴를 골라드릴게요."}
                    {step === 4 && "거의 다 왔어요! 마지막 질문입니다."}
                </p>
            </div>
        </div>

        {/* 컨텐츠 영역 (스크롤 가능) */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
            
            {/* STEP 1: 음식 취향 */}
            {step === 1 && (
                <div className="grid grid-cols-2 gap-3">
                    {OPTIONS.foods.map(opt => (
                        <button 
                            key={opt} 
                            onClick={() => toggleItem(foods, setFoods, opt)}
                            className={`p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${foods.includes(opt) ? "border-primary bg-primary/10 text-primary" : "border-gray-200 hover:bg-gray-50"}`}
                        >
                            {opt}
                            {foods.includes(opt) && <Check className="w-4 h-4"/>}
                        </button>
                    ))}
                </div>
            )}

            {/* STEP 2: 분위기 */}
            {step === 2 && (
                <div className="flex flex-wrap gap-2">
                    {OPTIONS.vibes.map(opt => (
                        <Badge 
                            key={opt} 
                            variant={vibes.includes(opt) ? "default" : "outline"}
                            className={`cursor-pointer px-4 py-2 text-sm rounded-full transition-all ${vibes.includes(opt) ? "hover:bg-primary/90" : "hover:bg-gray-100 border-gray-300"}`}
                            onClick={() => toggleItem(vibes, setVibes, opt)}
                        >
                            {opt}
                        </Badge>
                    ))}
                </div>
            )}

            {/* STEP 3: 술 & 기피 음식 */}
            {step === 3 && (
                <div className="space-y-6">
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold flex items-center gap-2"><Wine className="w-4 h-4"/> 주류 취향</h3>
                        <div className="flex flex-wrap gap-2">
                            {OPTIONS.alcohol.map(opt => (
                                <Badge 
                                    key={opt} 
                                    variant={alcohol.includes(opt) ? "secondary" : "outline"}
                                    className={`cursor-pointer px-3 py-1.5 ${alcohol.includes(opt) ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" : ""}`}
                                    onClick={() => toggleItem(alcohol, setAlcohol, opt)}
                                >
                                    {opt}
                                </Badge>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-red-500"><ThumbsDown className="w-4 h-4"/> 못 먹거나 싫어하는 것</h3>
                        <div className="flex flex-wrap gap-2">
                            {OPTIONS.dislikes.map(opt => (
                                <Badge 
                                    key={opt} 
                                    variant="outline"
                                    className={`cursor-pointer px-3 py-1.5 ${dislikes.includes(opt) ? "bg-red-50 border-red-200 text-red-600" : "border-dashed"}`}
                                    onClick={() => toggleItem(dislikes, setDislikes, opt)}
                                >
                                    {opt}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 4: 예산 & 편의시설 */}
            {step === 4 && (
                <div className="space-y-8">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold flex items-center gap-2"><DollarSign className="w-4 h-4"/> 1인당 평균 예산</h3>
                            <span className="text-lg font-bold text-primary">{avgSpend.toLocaleString()}원</span>
                        </div>
                        <input 
                            type="range" 
                            min="10000" max="150000" step="5000" 
                            value={avgSpend} 
                            onChange={(e) => setAvgSpend(parseInt(e.target.value))}
                            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>가성비 (1만원)</span>
                            <span>플렉스 (15만원+)</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold flex items-center gap-2"><Car className="w-4 h-4"/> 필수 편의 시설</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {OPTIONS.conditions.map(opt => (
                                <div 
                                    key={opt}
                                    onClick={() => toggleItem(conditions, setConditions, opt)}
                                    className={`text-xs px-3 py-2 rounded-lg border text-center cursor-pointer transition-all ${conditions.includes(opt) ? "bg-gray-800 text-white border-gray-800" : "bg-white hover:bg-gray-50"}`}
                                >
                                    {opt}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 bg-white border-t flex gap-2">
            {step > 1 && (
                <Button variant="outline" onClick={prevStep} className="w-1/3">
                    <ChevronLeft className="w-4 h-4 mr-1"/> 이전
                </Button>
            )}
            
            {step < totalSteps ? (
                <Button onClick={nextStep} className="flex-1 bg-gray-900 hover:bg-black">
                    다음 <ChevronRight className="w-4 h-4 ml-1"/>
                </Button>
            ) : (
                <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={foods.length === 0}>
                    <Sparkles className="w-4 h-4 mr-2"/> 분석 완료 및 시작
                </Button>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}