'use client'

import React, { useEffect, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'

interface MapComponentProps {
  onBoundsChange: (bounds: { southWest: { lng: number; lat: number }; northEast: { lng: number; lat: number } }) => void
}

export default function MapComponent({ onBoundsChange }: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)

  useEffect(() => {
    // Inject security configuration globally
    (window as any)._AMapSecurityConfig = {
      securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_KEY,
    }

    AMapLoader.load({
      key: process.env.NEXT_PUBLIC_AMAP_KEY || '',
      version: '2.0',
      plugins: ['AMap.Geolocation'], // Load Geolocation plugin
    })
      .then((AMap) => {
        if (!mapContainerRef.current) return

        const map = new AMap.Map(mapContainerRef.current, {
          viewMode: '3D',
          zoom: 15,
          center: [116.397428, 39.90923], // Default center (Beijing)
        })

        setMapInstance(map)

        // Add geolocation
        const geolocation = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          position: 'RB',
          offset: [10, 20],
          zoomToAccuracy: true,
        })
        map.addControl(geolocation)
        
        // Initial positioning
        geolocation.getCurrentPosition((status: string, result: any) => {
          if (status === 'complete') {
            console.log('Located successfully:', result)
          } else {
            console.error('Location failed:', result)
          }
        })

        // Event listeners
        const handleMoveEnd = () => {
          const bounds = map.getBounds()
          const southWest = bounds.getSouthWest()
          const northEast = bounds.getNorthEast()
          
          onBoundsChange({
            southWest: { lng: southWest.lng, lat: southWest.lat },
            northEast: { lng: northEast.lng, lat: northEast.lat },
          })
        }

        map.on('moveend', handleMoveEnd)
        map.on('zoomend', handleMoveEnd)
        
        // Trigger once initially
        handleMoveEnd()

      })
      .catch((e) => {
        console.error('AMap load failed:', e)
      })

    return () => {
      if (mapInstance) {
        mapInstance.destroy()
      }
    }
  }, [])

  return <div ref={mapContainerRef} className="w-full h-full" />
}
