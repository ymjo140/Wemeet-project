"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MapPin, Star, Settings, Bell, Shield, HelpCircle, LogOut, Palette, Heart, Award } from "lucide-react"

const savedPlaces = [
  { id: 1, name: "강남역 스타벅스", visits: 12, icon: "☕" },
  { id: 2, name: "홍대 포차거리", visits: 8, icon: "🍺" },
  { id: 3, name: "신촌 카페거리", visits: 15, icon: "🍰" },
]

const reviews = [
  { id: 1, place: "강남역 이자카야", rating: 4.5, date: "2025-12-20" },
  { id: 2, place: "홍대 파스타집", rating: 5.0, date: "2025-12-18" },
]

export function MyPageTab() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <h1 className="text-2xl font-bold">마이페이지</h1>
      </div>

      <div className="px-4 space-y-4 pb-4">
        {/* Profile Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="text-2xl">😊</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold">김민수</h2>
                <p className="text-sm text-muted-foreground mt-1">minsu@wemeet.com</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="gap-1">
                    <Award className="w-3 h-3" />
                    위밋왕 Lv.5
                  </Badge>
                  <Badge variant="outline">리뷰 {reviews.length}개</Badge>
                </div>
              </div>
            </div>

            <Button className="w-full mt-4 gap-2 bg-transparent" variant="outline">
              <Palette className="w-4 h-4" />
              아바타 꾸미기
            </Button>
          </CardContent>
        </Card>

        {/* 내가 저장한 곳 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              내가 저장한 곳
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {savedPlaces.map((place) => (
              <div
                key={place.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center text-xl">
                    {place.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{place.name}</p>
                    <p className="text-xs text-muted-foreground">방문 {place.visits}회</p>
                  </div>
                </div>
                <Badge variant="outline">{place.visits}회</Badge>
              </div>
            ))}
            <Button variant="ghost" className="w-full mt-2" size="sm">
              지도에서 보기
            </Button>
          </CardContent>
        </Card>

        {/* 단골 WeMeet */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              단골 WeMeet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">자주 가는 모임을 단골로 추가하세요</p>
            </div>
          </CardContent>
        </Card>

        {/* 내 리뷰 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              내가 작성한 리뷰
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reviews.map((review) => (
              <div key={review.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-semibold text-sm">{review.place}</p>
                  <p className="text-xs text-muted-foreground">{review.date}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold">{review.rating}</span>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-2 bg-transparent" size="sm">
              위밋왕 되기
            </Button>
          </CardContent>
        </Card>

        {/* 설정 메뉴 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Button variant="ghost" className="w-full justify-start gap-3" size="lg">
              <Bell className="w-5 h-5" />
              알림 설정
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3" size="lg">
              <Shield className="w-5 h-5" />
              개인정보 보호
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3" size="lg">
              <HelpCircle className="w-5 h-5" />
              고객 지원
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              size="lg"
            >
              <LogOut className="w-5 h-5" />
              로그아웃
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
