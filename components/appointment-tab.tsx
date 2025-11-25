"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Navigation, Clock, Users, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const nearestAppointment = {
  id: 1,
  title: "팀 프로젝트 신년회",
  date: "12월 25일",
  time: "오후 7:00",
  location: "어반브런치 & 바",
  address: "서울시 강남구",
  distance: "1.2km",
  aiAccuracy: "95%",
  participants: [
    { id: 1, name: "영수", avatar: "🧑", status: "arriving", arrivalMinutes: 5, position: { x: 25, y: 25 } },
    { id: 2, name: "철수", avatar: "👨", status: "coming", arrivalMinutes: 12, position: { x: 75, y: 20 } },
    { id: 3, name: "영희", avatar: "👩", status: "coming", arrivalMinutes: 8, position: { x: 80, y: 70 } },
  ],
}

const upcomingAppointments = [
  { id: 2, title: "주말 저녁 맛집 약속", date: "12월 26일", time: "저녁 6시" },
  { id: 3, title: "스터디 그룹 미팅", date: "1월 3일", time: "오후 2시" },
]

export function AppointmentTab() {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">가장 가까운 약속</h1>
        <p className="text-sm text-muted-foreground">친구들의 위치와 길찾기를 확인하세요</p>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="w-4 h-4" />
            <span>다음 약속들</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          {upcomingAppointments.map((apt) => (
            <div
              key={apt.id}
              className="flex items-center justify-between text-xs bg-background rounded p-2 hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <span className="font-medium">{apt.title}</span>
              <span className="text-muted-foreground">
                {apt.date} · {apt.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Appointment Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary/10 via-accent/10 to-chart-2/10 border-b">
          <CardTitle className="flex items-center justify-between">
            <span>{nearestAppointment.title}</span>
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" />
              {nearestAppointment.time}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{nearestAppointment.location}</span>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <div className="relative w-full h-72 bg-muted rounded-lg overflow-hidden">
            <img src="/map-location.jpg" alt="Map" className="w-full h-full object-cover opacity-80" />

            {/* Friend Avatars with arrival time */}
            {nearestAppointment.participants.map((participant) => (
              <div
                key={participant.id}
                className="absolute transition-all duration-300 hover:scale-110"
                style={{
                  left: `${participant.position.x}%`,
                  top: `${participant.position.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  {/* Character Avatar */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-gray-100 flex items-center justify-center shadow-lg border-3 border-white overflow-hidden">
                      <span className="text-3xl">{participant.avatar}</span>
                    </div>
                    {participant.status === "arrived" && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                  {/* Name */}
                  <div className="bg-background/90 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap shadow-sm">
                    {participant.name}
                  </div>
                  {/* Arrival time in minutes */}
                  <div className="bg-primary/90 text-primary-foreground backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm">
                    {participant.arrivalMinutes}분
                  </div>
                </div>
              </div>
            ))}

            {/* My Avatar - Center */}
            <div
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-white border-4 border-primary shadow-xl flex items-center justify-center overflow-hidden">
                    <span className="text-3xl">👤</span>
                  </div>
                  {/* Pulse ring effect */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-50" />
                  <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-pulse" />
                </div>
                <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold shadow-md">
                  나 (강남역)
                </div>
              </div>
            </div>

            {/* AI Accuracy Badge */}
            <Badge className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm">
              AI {nearestAppointment.aiAccuracy}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button className="bg-secondary text-secondary-foreground rounded-lg p-3 flex items-center justify-center gap-2 font-semibold hover:bg-secondary/80 transition-colors">
              <MapPin className="w-5 h-5" />
              <span>Map 크게 보기</span>
            </button>
            <button className="bg-primary text-primary-foreground rounded-lg p-3 flex items-center justify-center gap-2 font-semibold hover:bg-primary/90 transition-colors">
              <Users className="w-5 h-5" />
              <span>내 아바타 꾸미기</span>
            </button>
          </div>

          {/* Navigation Button */}
          <button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-lg p-3 flex items-center justify-center gap-2 font-semibold hover:opacity-90 transition-opacity">
            <Navigation className="w-5 h-5" />
            <span>길찾기 시작 ({nearestAppointment.distance})</span>
          </button>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="w-4 h-4" />
              <span>참여자 위치</span>
            </div>

            <div className="space-y-2">
              {nearestAppointment.participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-gray-100 flex items-center justify-center shadow border-2 border-background">
                      <span className="text-xl">{participant.avatar}</span>
                    </div>
                    <span className="text-sm font-medium">{participant.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">{participant.arrivalMinutes}분 후</span>
                    <Badge variant={participant.status === "arrived" ? "default" : "secondary"} className="text-xs">
                      {participant.status === "arrived" && "도착"}
                      {participant.status === "arriving" && "거의 도착"}
                      {participant.status === "coming" && "이동 중"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
