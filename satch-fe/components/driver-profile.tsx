"use client"

import { useState } from "react"
import { ArrowLeft, Copy, ExternalLink } from "lucide-react"
import LeaveReviewModal from "./leave-review-modal"

interface Review {
  id: number
  rating: number
  text: string
  reviewer: string
  arweaveLink: string
  timestamp: string
}

interface Driver {
  name: string
  walletAddress: string
  platform: string
  averageRating: number
  totalReviews: number
  totalComplaints: number
  reviews: Review[]
}

interface DriverProfileProps {
  driver: Driver
  onBack: () => void
}

export default function DriverProfile({ driver, onBack }: DriverProfileProps) {
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(driver.walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getRatingStars = (rating: number) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating)
  }

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b-2 border-black">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-black hover:opacity-70 transition-opacity mb-6 font-mono text-sm font-bold"
          >
            <ArrowLeft size={20} />
            BACK TO SEARCH
          </button>

          {/* Profile Header */}
          <div className="mb-8">
            <h1 className="font-press-start text-3xl md:text-4xl font-bold mb-4">{driver.name}</h1>

            {/* Wallet Address */}
            <div className="flex items-center gap-2 mb-4 font-mono text-sm">
              <code className="bg-gray-100 px-3 py-2 border border-black">{driver.walletAddress}</code>
              <button
                onClick={handleCopyAddress}
                className="p-2 hover:bg-gray-200 transition-colors border border-black"
                title="Copy address"
              >
                <Copy size={16} />
              </button>
            </div>

            {/* Platform */}
            <p className="font-mono text-sm text-gray-700">
              REGISTERED BY: <span className="font-bold">{driver.platform}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="border-b-2 border-black">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* Average Rating */}
            <div className="border-2 border-black p-6 text-center">
              <p className="font-mono text-xs text-gray-600 mb-2 tracking-widest">AVERAGE RATING</p>
              <p className="font-press-start text-2xl md:text-3xl mb-2">{driver.averageRating.toFixed(1)}</p>
              <p className="text-yellow-500 text-lg">{getRatingStars(Math.round(driver.averageRating))}</p>
            </div>

            {/* Total Reviews */}
            <div className="border-2 border-black p-6 text-center">
              <p className="font-mono text-xs text-gray-600 mb-2 tracking-widest">TOTAL REVIEWS</p>
              <p className="font-press-start text-2xl md:text-3xl">{driver.totalReviews}</p>
            </div>

            {/* Total Complaints */}
            <div className="border-2 border-black p-6 text-center">
              <p className="font-mono text-xs text-gray-600 mb-2 tracking-widest">COMPLAINTS</p>
              <p className="font-press-start text-2xl md:text-3xl text-red-600">{driver.totalComplaints}</p>
            </div>
          </div>

          {/* Leave Review Button */}
          <button
            onClick={() => setShowReviewModal(true)}
            className="w-full bg-yellow-300 text-black px-8 py-4 font-mono font-bold text-sm tracking-widest border-2 border-black hover:bg-yellow-400 transition-colors"
          >
            LEAVE A REVIEW
          </button>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="font-mono text-sm font-bold tracking-widest mb-6 text-gray-700">
          REVIEW LEDGER ({driver.reviews.length})
        </h2>

        <div className="space-y-4">
          {driver.reviews.map((review) => (
            <div key={review.id} className="border-2 border-black p-6">
              {/* Rating */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-yellow-500 text-lg">{getRatingStars(review.rating)}</div>
                <span className="font-mono text-xs text-gray-600">{review.timestamp}</span>
              </div>

              {/* Review Text */}
              <p className="text-black mb-4 leading-relaxed">{review.text}</p>

              {/* Reviewer & Link */}
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-gray-600">
                  BY: <span className="font-bold">{review.reviewer}</span>
                </p>
                <a
                  href={review.arweaveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-black hover:opacity-70 transition-opacity border border-black px-3 py-1 font-mono text-xs"
                >
                  ARWEAVE
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leave Review Modal */}
      {showReviewModal && <LeaveReviewModal onClose={() => setShowReviewModal(false)} driverName={driver.name} />}
    </main>
  )
}
