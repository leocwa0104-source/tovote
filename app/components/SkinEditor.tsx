'use client'

import { useState, useEffect } from 'react'
import { createSkin, getSkins, setActiveSkin, deleteSkin, getActiveSkin } from '@/app/actions/admin'

const WIDTH = 48
const HEIGHT = 16

type Skin = {
  id: string
  name: string
  pixelData: string
  createdAt: Date
  isActive: boolean
}

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
    const [skins, setSkins] = useState<Skin[]>([])
    const [activeSkinId, setActiveSkinId] = useState<string | null>(null)

    useEffect(() => {
        loadSkins()
    }, [])

    const loadSkins = async () => {
        const [skinsRes, activeRes] = await Promise.all([
            getSkins(),
            getActiveSkin()
        ])
        if (skinsRes) setSkins(skinsRes as Skin[])
        if (activeRes) setActiveSkinId(activeRes.id)
    }

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
                // Reload list
                loadSkins()
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

    const handleApply = async (skinId: string) => {
        if (loading) return
        setLoading(true)
        try {
            const res = await setActiveSkin(skinId)
            if (res.success) {
                setActiveSkinId(skinId)
            } else {
                alert(res.error || 'Failed to apply skin')
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (skinId: string) => {
        if (!confirm('Are you sure you want to delete this skin?')) return
        if (loading) return
        setLoading(true)
        try {
            const res = await deleteSkin(skinId)
            if (res.success) {
                loadSkins()
                if (activeSkinId === skinId) setActiveSkinId(null)
            } else {
                alert(res.error || 'Failed to delete skin')
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleLoad = (skin: Skin) => {
        if (confirm('Load this skin into editor? Current unsaved changes will be lost.')) {
            setName(skin.name)
            try {
                const data = JSON.parse(skin.pixelData)
                setGrid(data)
            } catch (e) {
                console.error("Failed to parse skin data", e)
            }
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

                {/* Saved Skins List */}
                <div className="border-t pt-4 mt-4">
                    <h4 className="text-lg font-bold mb-4">Saved Skins</h4>
                    {skins.length === 0 ? (
                        <p className="text-gray-400 italic">No skins saved yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {skins.map(skin => (
                                <div key={skin.id} className={`border rounded p-3 flex flex-col gap-2 ${activeSkinId === skin.id ? 'border-green-500 ring-1 ring-green-500 bg-green-50' : 'border-gray-200'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium truncate" title={skin.name}>{skin.name}</span>
                                        {activeSkinId === skin.id && <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">Active</span>}
                                    </div>
                                    
                                    {/* Preview */}
                                    <div className="h-8 w-full bg-gray-100 rounded overflow-hidden relative">
                                        {(() => {
                                            try {
                                                const pixels = JSON.parse(skin.pixelData)
                                                return (
                                                    <div className="w-full h-full grid" style={{ gridTemplateColumns: `repeat(${WIDTH}, 1fr)` }}>
                                                        {pixels.map((c: string, i: number) => (
                                                            <div key={i} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }} />
                                                        ))}
                                                    </div>
                                                )
                                            } catch { return null }
                                        })()}
                                    </div>

                                    <div className="flex gap-2 text-xs mt-1">
                                        <button 
                                            onClick={() => handleApply(skin.id)}
                                            disabled={loading || activeSkinId === skin.id}
                                            className="flex-1 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 disabled:opacity-50 transition-colors"
                                        >
                                            {activeSkinId === skin.id ? 'Applied' : 'Apply'}
                                        </button>
                                        <button 
                                            onClick={() => handleLoad(skin)}
                                            className="px-2 py-1 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded border border-gray-200"
                                            title="Edit"
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(skin.id)}
                                            disabled={loading}
                                            className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded border border-red-200 disabled:opacity-50"
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
