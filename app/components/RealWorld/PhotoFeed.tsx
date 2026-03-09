'use client'

import React from 'react'

interface Photo {
  id: string
  url: string
  lat: number
  lng: number
  timestamp: Date
  author: string
}

interface PhotoFeedProps {
  photos: Photo[]
  loading: boolean
}

export default function PhotoFeed({ photos, loading }: PhotoFeedProps) {
  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading photos...</div>
  }

  if (photos.length === 0) {
    return <div className="p-4 text-center text-gray-500">No photos in this area. Try moving the map!</div>
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-2 overflow-y-auto h-full">
      {photos.map((photo) => (
        <div key={photo.id} className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group">
          {/* Use standard img for now, replace with Next/Image if optimizing */}
          <img src={photo.url} alt={`Photo by ${photo.author}`} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {photo.author} • {new Date(photo.timestamp).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  )
}
