'use client'

import React, { useState, useCallback } from 'react'
import MapComponent from './MapComponent'
import PhotoFeed from './PhotoFeed'

export default function RealWorldLayout() {
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentBounds, setCurrentBounds] = useState<any>(null)

  const handleBoundsChange = useCallback((bounds: any) => {
    setCurrentBounds(bounds)
    // Simulate fetching photos
    setLoading(true)
    setTimeout(() => {
      // Mock data based on bounds (randomly generated for demo)
      const mockPhotos = Array.from({ length: Math.floor(Math.random() * 10) }).map((_, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        url: `https://picsum.photos/seed/${Math.random()}/300/300`, // Placeholder images
        lat: bounds.southWest.lat + Math.random() * (bounds.northEast.lat - bounds.southWest.lat),
        lng: bounds.southWest.lng + Math.random() * (bounds.northEast.lng - bounds.southWest.lng),
        timestamp: new Date(),
        author: 'User' + Math.floor(Math.random() * 100),
      }))
      setPhotos(mockPhotos)
      setLoading(false)
    }, 500)
  }, [])

  return (
    <div className="flex h-full w-full">
      {/* Map Section - Takes up 60% of width on large screens, or top half on mobile (responsive needed) */}
      <div className="w-2/3 h-full relative border-r border-gray-200">
        <MapComponent onBoundsChange={handleBoundsChange} />
        
        {/* Camera Button Overlay */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
           <button className="bg-black text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform">
             <span>📷</span> Snap
           </button>
        </div>
      </div>

      {/* Photo Feed Section */}
      <div className="w-1/3 h-full bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-lg">Nearby Moments</h2>
          <p className="text-xs text-gray-500">Exploring area...</p>
        </div>
        <div className="flex-grow overflow-hidden">
          <PhotoFeed photos={photos} loading={loading} />
        </div>
      </div>
    </div>
  )
}
