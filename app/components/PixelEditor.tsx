'use client'

import { useState } from 'react'
import { saveSystemLogo } from '@/app/actions/admin'

const GRID_SIZE = 12
const PALETTE = [
  'transparent', '#000000', '#FFFFFF', 
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#4B5563', '#9CA3AF', '#D1D5DB'
]

export default function PixelEditor({ initialData }: { initialData?: string[] }) {
  const [grid, setGrid] = useState<string[]>(
    initialData && initialData.length === GRID_SIZE * GRID_SIZE 
      ? initialData 
      : Array(GRID_SIZE * GRID_SIZE).fill('transparent')
  )
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [loading, setLoading] = useState(false)

  const handlePixelClick = (index: number) => {
    const newGrid = [...grid]
    newGrid[index] = selectedColor
    setGrid(newGrid)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
        await saveSystemLogo(grid)
        alert('Logo saved!')
    } catch (e) {
        alert('Failed to save logo')
    } finally {
        setLoading(false)
    }
  }

  const handleClear = () => {
      if(confirm('Clear all?')) {
          setGrid(Array(GRID_SIZE * GRID_SIZE).fill('transparent'))
      }
  }

  return (
    <div className="p-4 border rounded bg-white shadow-sm">
      <h3 className="text-lg font-bold mb-4">Pixel Logo Editor ({GRID_SIZE}x{GRID_SIZE})</h3>
      
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        {/* Canvas */}
        <div>
            <div className="mb-2 text-sm text-gray-500">Click to paint</div>
            <div 
            className="grid gap-px bg-gray-200 border border-gray-300 shadow-inner select-none"
            style={{ 
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                width: 'fit-content'
            }}
            >
            {grid.map((color, i) => (
                <div
                key={i}
                onMouseDown={() => handlePixelClick(i)}
                onMouseEnter={(e) => { if (e.buttons === 1) handlePixelClick(i) }}
                className="w-6 h-6 cursor-pointer hover:opacity-90"
                style={{ backgroundColor: color === 'transparent' ? 'white' : color }}
                title={`Pixel ${i}`}
                >
                    {color === 'transparent' && <div className="w-full h-full bg-gray-50 text-[8px] flex items-center justify-center text-gray-200">.</div>}
                </div>
            ))}
            </div>
        </div>

        {/* Palette */}
        <div className="flex flex-col gap-2">
          <div className="font-bold text-sm">Palette</div>
          <div className="grid grid-cols-4 gap-2">
            {PALETTE.map(color => (
              <div
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded border cursor-pointer transition-transform hover:scale-105 ${selectedColor === color ? 'ring-2 ring-offset-1 ring-black scale-110' : ''}`}
                style={{ backgroundColor: color === 'transparent' ? 'white' : color }}
                title={color}
              >
                  {color === 'transparent' && <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">/</div>}
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-2 bg-gray-50 rounded text-xs text-gray-500">
              Selected: <span className="font-mono">{selectedColor}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {loading ? 'Saving...' : 'Save Logo'}
        </button>
        <button 
          onClick={handleClear}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium transition-colors"
        >
          Clear Canvas
        </button>
      </div>
    </div>
  )
}
