"use client"

import { useState } from "react"
import HomePage from "@/components/home-page"
import { useRouter } from "next/navigation"

export default function Page() {
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  const handleSearch = (query: string) => {
    if (!query.trim()) return
    setIsSearching(true)
    router.push(`/driver/${encodeURIComponent(query.trim())}`)
    setIsSearching(false)
  }

  return <HomePage onSearch={handleSearch} isSearching={isSearching} />
}
