'use client'

import { useState } from 'react'
import { createSkin } from '@/app/actions/admin'

const WIDTH = 48
const HEIGHT = 16

const NEO_CHINESE_PALETTE = [
    { name: 'Transparent', value: 'transparent' },
    { name: '朱砂', value: '#ff461f' },
    { name: '靛蓝', value: '#177cb0' },
    { name: '黛色', value: '#4a4266' },
    { name: '月白', value: '#d6ecf0' },
    { name: '藤黄', value: '#ffb61e' },
    { name: '胭脂', value: '#9d2933' },
    { name: '竹青', value: '#789262' },
    { name: '玄', value: '#622a1d' },
    { name: '赤金', value: '#f2be45' },
    { name: '苍色', value: '#7397ab' },
    { name: '墨色', value: '#333333' },
    { name: '素', value: '#f0f0f4' }
]

export default function SkinEditor() {
    const [name, setName] = useState('')
    const [grid, setGrid] = useState<string[]>(Array(WIDTH * HEIGHT).fill('transparent'))
    const [selectedColor, setSelectedColor] = useState(NEO_CHINESE_PALETTE[1].value)
    const [loading, setLoading] = useState(false)
    const [isDrawing, setIsDrawing] = useState(false)

    const handlePixelAction = (index: number) => {
        const newGrid = [...grid]
        newGrid[index] = selectedColor
        setGrid(newGrid)
    }

    const handleMouseDown = (index: number) => {
        setIsDrawing(true)
        handlePixelAction(index)
    }

    const handleMouseEnter = (index: number) => {
        if (isDrawing) {
            handlePixelAction(index)
        }
    }

    const handleMouseUp = () => {
        setIsDrawing(false)
    }

    const handleSave = async () => {
        if (!name.trim()) {
            alert('Please give your skin a name')
            return
        }
        setLoading(true)
        try {
            const res = await createSkin({
                name,
                pixelData: JSON.stringify(grid)
            })
            if (res.success) {
                alert('Skin created successfully!')
                setName('')
                // Optionally reset grid or keep for variations
            } else {
                alert(res.error || 'Failed to create skin')
            }
        } catch (e) {
            console.error(e)
            alert('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleClear = () => {
        if (confirm('Clear canvas?')) {
            setGrid(Array(WIDTH * HEIGHT).fill('transparent'))
        }
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <h3 className="text-xl font-bold mb-4">Topic Skin Editor (Neo-Chinese Style)</h3>
            
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Skin Name</label>
                <input 
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Bamboo Forest"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                />
            </div>

            <div className="flex flex-col gap-6">
                {/* Canvas Container */}
                <div className="overflow-x-auto pb-4">
                    <div 
                        className="grid gap-px bg-gray-100 border border-gray-300 shadow-inner select-none mx-auto"
                        style={{ 
                            gridTemplateColumns: `repeat(${WIDTH}, 1fr)`,
                            width: 'fit-content',
                            // Scale down visually if needed but keep aspect ratio
                            // Each cell e.g. 12px
                        }}
                    >
                        {grid.map((color, i) => (
                            <div
                                key={i}
                                onMouseDown={() => handleMouseDown(i)}
                                onMouseEnter={() => handleMouseEnter(i)}
                                className="w-3 h-3 cursor-pointer hover:opacity-90"
                                style={{ backgroundColor: color === 'transparent' ? 'white' : color }}
                                title={`Pixel ${i}`}
                            />
                        ))}
                    </div>
                    <div className="text-center text-xs text-gray-400 mt-2">
                        Canvas Size: {WIDTH}x{HEIGHT} (Matches Topic Card Ratio)
                    </div>
                </div>

                {/* Palette */}
                <div>
                    <div className="text-sm font-bold mb-2">Palette (Neo-Chinese)</div>
                    <div className="flex flex-wrap gap-3">
                        {NEO_CHINESE_PALETTE.map(color => (
                            <button
                                key={color.value}
                                onClick={() => setSelectedColor(color.value)}
                                className={`
                                    w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 relative
                                    ${selectedColor === color.value ? 'border-gray-900 scale-110 shadow-md' : 'border-transparent'}
                                `}
                                style={{ backgroundColor: color.value === 'transparent' ? 'white' : color.value }}
                                title={color.name}
                            >
                                {color.value === 'transparent' && (
                                    <span className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs">/</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        Selected: <span className="font-bold" style={{ color: selectedColor !== 'transparent' ? selectedColor : 'black' }}>
                            {NEO_CHINESE_PALETTE.find(c => c.value === selectedColor)?.name || selectedColor}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 border-t pt-4">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 font-medium"
                    >
                        {loading ? 'Saving...' : 'Save Skin'}
                    </button>
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                    >
                        Clear Canvas
                    </button>
                </div>
            </div>
        </div>
    )
}
