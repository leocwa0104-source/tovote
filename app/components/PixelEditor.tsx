'use client'

import { useState, useEffect } from 'react'
import { saveSystemLogo } from '@/app/actions/admin'
import TovoteLogo from '@/app/components/TovoteLogo'

const GRID_SIZE = 32
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

  // Reset grid if GRID_SIZE changes (dev environment mostly)
  useEffect(() => {
    if (grid.length !== GRID_SIZE * GRID_SIZE) {
        setGrid(Array(GRID_SIZE * GRID_SIZE).fill('transparent'))
    }
  }, [grid.length])

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
                className="w-4 h-4 cursor-pointer hover:opacity-90"
                style={{ backgroundColor: color === 'transparent' ? 'white' : color }}
                title={`Pixel ${i}`}
                >
                    {color === 'transparent' && <div className="w-full h-full bg-gray-50 text-[6px] flex items-center justify-center text-gray-200">.</div>}
                </div>
            ))}
            </div>
        </div>

        <div className="flex flex-col gap-6">
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
                
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-500">
                    Selected: <span className="font-mono">{selectedColor}</span>
                </div>
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-2">
                <div className="font-bold text-sm">Preview</div>
                <div className="p-4 bg-gray-100 rounded flex items-center justify-center gap-4">
                     {/* Preview at different scales */}
                     <div className="flex flex-col items-center gap-1">
                        <div className="text-xs text-gray-400">Normal</div>
                        <div className="bg-white p-2 rounded shadow-sm">
                             <TovoteLogo pixelData={grid} className="text-xl" />
                        </div>
                     </div>
                     <div className="flex flex-col items-center gap-1">
                        <div className="text-xs text-gray-400">Large</div>
                        <div className="bg-white p-2 rounded shadow-sm">
                             <TovoteLogo pixelData={grid} className="text-4xl" />
                        </div>
                     </div>
                </div>
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
