"use client"

import { useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

// 1. 실제 로직이 들어있는 컴포넌트 (분리)
function KakaoCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get("code")
  
  const isCalledRef = useRef(false)

  useEffect(() => {
    const login = async () => {
      if (code && !isCalledRef.current) {
        isCalledRef.current = true 

        try {
          const res = await fetch("https://wemeet-backend-xqlo.onrender.com/api/auth/kakao", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          })
          
          const data = await res.json()

          if (res.ok) {
            if (data.access_token) {
                localStorage.setItem("token", data.access_token)
                localStorage.setItem("userId", String(data.user_id))
                localStorage.setItem("userName", data.name)
                window.location.href = "/"
            } else {
                alert("로그인 처리는 되었으나 토큰이 없습니다.")
                router.push("/login")
            }
          } else {
            alert(`로그인 실패: ${data.detail || "알 수 없는 오류"}`)
            router.push("/login")
          }
        } catch (e) {
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
    </div>
  )
}

// 2. Suspense로 감싸는 메인 컴포넌트 (필수!)
export default function KakaoCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <KakaoCallbackContent />
    </Suspense>
  )
}