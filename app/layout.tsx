import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WeMeet - 우리 만남의 시작",
  description: "중간 지점 찾기 및 장소 추천 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard.css" />
      </head>
      <body className="font-['Pretendard'] antialiased bg-[#F3F4F6] text-gray-900">
        {children}
      </body>
    </html>
  );
}