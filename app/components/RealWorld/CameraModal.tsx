'use client'

import React, { useRef, useState, useCallback } from 'react'

interface CameraModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (photoDataUrl: string) => void
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string>('')

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer back camera
        audio: false,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        // Explicitly play the video
        videoRef.current.play().catch(e => console.error("Error playing video:", e))
      }
      setError('')
    } catch (err: any) {
      console.error('Camera access denied:', err)
      setError('Could not access camera. Please check permissions.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  const handleCapture = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg')
        onCapture(dataUrl)
        stopCamera()
      }
    }
  }, [onCapture, stopCamera])

  // Start camera when modal opens
  React.useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [isOpen, startCamera, stopCamera])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white p-2 z-10"
      >
        ✕
      </button>

      {/* Video Preview */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {error ? (
          <div className="text-white text-center p-4">
            <p className="mb-4">{error}</p>
            <button
              onClick={onClose}
              className="bg-white text-black px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>

      {/* Capture Controls */}
      {!error && (
        <div className="absolute bottom-8 w-full flex justify-center items-center gap-8">
          <button
            onClick={handleCapture}
            className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-lg hover:scale-105 transition-transform"
          />
        </div>
      )}
    </div>
  )
}
