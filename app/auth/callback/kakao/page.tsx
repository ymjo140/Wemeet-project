"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function KakaoCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get("code")
  
  // 🌟 [수정] React 18의 StrictMode 때문에 useEffect가 두 번 실행되는 것을 방지
  const isCalledRef = useRef(false)

  useEffect(() => {
    const login = async () => {
      if (code && !isCalledRef.current) {
        isCalledRef.current = true // 중복 실행 방지

        console.log("🚀 카카오 인가 코드:", code) // 1. 코드 확인

        try {
          const res = await fetch("http://127.0.0.1:8000/api/auth/kakao", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          })
          
          console.log("📡 응답 상태:", res.status, res.statusText) // 2. 상태 확인

          const data = await res.json()
          console.log("📦 응답 데이터:", data) // 3. 데이터 확인

          if (res.ok) {
            // 토큰이 실제로 있는지 확인
            if (data.access_token) {
                console.log("✅ 로그인 성공! 토큰 저장 중...")
                localStorage.setItem("token", data.access_token)
                localStorage.setItem("userId", String(data.user_id))
                localStorage.setItem("userName", data.name)
                
                console.log("🏃 메인으로 이동!")
                router.push("/") 
            } else {
                console.error("❌ 토큰이 응답에 없음:", data)
                alert("로그인 처리는 되었으나 토큰이 없습니다.")
                router.push("/login")
            }
          } else {
            console.error("❌ 백엔드 에러:", data)
            alert(`로그인 실패: ${data.detail || "알 수 없는 오류"}`)
            router.push("/login")
          }
        } catch (e) {
          console.error("❌ 네트워크/코드 에러:", e)
          alert("로그인 중 오류가 발생했습니다.")
          router.push("/login")
        }
      }
    }
    login()
  }, [code, router])

  return (
    <div className="h-screen flex items-center justify-center flex-col gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      <p className="text-gray-500 font-medium">카카오 로그인 중입니다...</p>
      <p className="text-xs text-gray-300">{code ? "코드 확인됨" : "코드 대기중"}</p>
    </div>
  )
}