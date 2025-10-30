"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"

interface HomePageProps {
  onSearch: (query: string) => void
  isSearching: boolean
}

export default function HomePage({ onSearch, isSearching }: HomePageProps) {
  const [searchInput, setSearchInput] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchInput)
  }

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="font-press-start text-4xl md:text-5xl font-bold mb-4 tracking-wider">SATCH</h1>
        <p className="text-sm md:text-base font-mono tracking-widest text-gray-700">PERMANENT, PUBLIC ACCOUNTABILITY</p>
      </div>

      {/* Search Section */}
      <div className="w-full max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Search Input */}
          <div className="border-2 border-black">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter driver's license plate (e.g., KA-01-1234)"
              className="w-full px-6 py-4 bg-white text-black placeholder-gray-500 font-mono text-sm focus:outline-none"
            />
          </div>

          {/* Search Button */}
          <button
            type="submit"
            disabled={isSearching}
            className="bg-yellow-300 text-black px-8 py-4 font-mono font-bold text-sm tracking-widest border-2 border-black hover:bg-yellow-400 disabled:opacity-50 transition-colors"
          >
            {isSearching ? "SEARCHING..." : "SEARCH"}
          </button>
        </form>
      </div>

      {/* Company Portal Link */}
      <div className="mt-8 w-full max-w-2xl">
        <Link href="/company">
          <button className="w-full bg-white text-black px-8 py-4 font-mono font-bold text-sm tracking-widest border-2 border-black hover:bg-gray-100 transition-colors">
            COMPANY PORTAL →
          </button>
        </Link>
      </div>

      {/* Footer Info */}
      <div className="mt-16 text-center text-xs font-mono text-gray-600 max-w-md">
        <p>Search for any service worker's permanent, immutable reputation record on Solana.</p>
      </div>
    </main>
  )
}
