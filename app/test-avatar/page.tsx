"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"

// 1. 아바타 파츠 옵션 정의 (DiceBear API)
const AVATAR_OPTIONS: any = {
    top: [
        { id: "shortHair", name: "짧은 머리" },
        { id: "longHair", name: "긴 머리" },
        { id: "eyepatch", name: "안대" },
        { id: "hat", name: "모자" },
        { id: "hijab", name: "히잡" },
        { id: "turban", name: "터번" },
        { id: "bigHair", name: "풍성한 펌" },
        { id: "bob", name: "단발" },
        { id: "curvy", name: "웨이브" },
        { id: "winterHat02", name: "털모자" }
    ],
    clothing: [
        { id: "hoodie", name: "후드티" },
        { id: "blazer", name: "자켓" },
        { id: "shirtCrewNeck", name: "티셔츠" },
        { id: "shirtScoopNeck", name: "파인 옷" },
        { id: "dress", name: "드레스" },
        { id: "overall", name: "멜빵" },
        { id: "collarAndSweater", name: "니트" },
        { id: "shirtVNeck", name: "브이넥" }
    ],
    accessories: [
        { id: "none", name: "없음" },
        { id: "prescription01", name: "안경 1" },
        { id: "prescription02", name: "안경 2" },
        { id: "sunglasses", name: "선글라스" },
        { id: "round", name: "동그란 안경" },
        { id: "kurt", name: "고글" }
    ],
    skinColor: [
        { id: "ffdbb4", name: "밝음" },
        { id: "edb98a", name: "중간" },
        { id: "d08b5b", name: "태닝" },
        { id: "ae5d29", name: "어두움" },
        { id: "f8d25c", name: "심슨색" }
    ]
};

// 2. URL 생성 함수
const getAvatarUrl = (config: any) => {
    const baseUrl = "https://api.dicebear.com/9.x/avataaars/svg";
    const params = new URLSearchParams({
        seed: "felix", 
        backgroundColor: "b6e3f4", 
        ...config
    });
    
    if (config.accessories === "none") params.delete("accessories");
    
    return `${baseUrl}?${params.toString()}`;
};

// 3. 페이지 컴포넌트
export default function AvatarTestPage() {
    const [config, setConfig] = useState({
        top: "shortHair",
        clothing: "hoodie",
        accessories: "none",
        skinColor: "ffdbb4"
    });

    const handleChange = (key: string, value: string) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-4xl flex flex-col md:flex-row gap-10 border border-gray-200">
                
                {/* 왼쪽: 미리보기 */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-80 h-80 bg-gradient-to-b from-blue-100 to-white rounded-full shadow-inner flex items-center justify-center border-8 border-white overflow-hidden relative mb-6">
                        <img 
                            src={getAvatarUrl(config)} 
                            alt="Avatar Preview" 
                            className="w-full h-full object-cover transition-all duration-300 hover:scale-110"
                        />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">아바타 테스트</h2>
                    <p className="text-sm text-gray-500 mb-4">옵션을 변경해보세요</p>
                    
                    <div className="w-full bg-gray-100 p-3 rounded-lg text-[10px] text-gray-500 font-mono break-all cursor-pointer hover:bg-gray-200" onClick={() => navigator.clipboard.writeText(getAvatarUrl(config))}>
                        {getAvatarUrl(config)}
                    </div>
                </div>

                {/* 오른쪽: 컨트롤 패널 */}
                <div className="flex-1 space-y-6 overflow-y-auto max-h-[600px] pr-2">
                    {/* 헤어 */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">💇‍♀️ 헤어 스타일</h3>
                        <div className="flex flex-wrap gap-2">
                            {AVATAR_OPTIONS.top.map((opt: any) => (
                                <Button key={opt.id} size="sm" variant={config.top === opt.id ? "default" : "outline"} onClick={() => handleChange("top", opt.id)} className="text-xs h-8">
                                    {opt.name}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* 의상 */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">👕 의상</h3>
                        <div className="flex flex-wrap gap-2">
                            {AVATAR_OPTIONS.clothing.map((opt: any) => (
                                <Button key={opt.id} size="sm" variant={config.clothing === opt.id ? "default" : "outline"} onClick={() => handleChange("clothing", opt.id)} className="text-xs h-8">
                                    {opt.name}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* 액세서리 */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">👓 안경</h3>
                        <div className="flex flex-wrap gap-2">
                            {AVATAR_OPTIONS.accessories.map((opt: any) => (
                                <Button key={opt.id} size="sm" variant={config.accessories === opt.id ? "default" : "outline"} onClick={() => handleChange("accessories", opt.id)} className="text-xs h-8">
                                    {opt.name}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* 피부색 */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">🎨 피부색</h3>
                        <div className="flex gap-3">
                            {AVATAR_OPTIONS.skinColor.map((opt: any) => (
                                <button key={opt.id} onClick={() => handleChange("skinColor", opt.id)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${config.skinColor === opt.id ? "border-black scale-110 shadow-md" : "border-gray-200"}`}
                                    style={{ backgroundColor: `#${opt.id}` }} title={opt.name}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}