// app/layout.tsx

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "WeMeet",
  description: "AI Group Recommendation",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <head>
        {/* ✅ [최종 수정] 사용자님이 주신 새 ID와 ncpKeyId 적용 */}
        <Script 
          strategy="beforeInteractive" 
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=6fuj0ui2d3`} 
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}