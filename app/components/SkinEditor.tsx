'use client'

import { useState, useEffect } from 'react'
import { createSkin, getSkins, setActiveSkin, deleteSkin, getActiveSkin } from '@/app/actions/admin'

const WIDTH = 64
const HEIGHT = 12

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

  const handlePixelClick = (index: number) => {
    const newGrid = [...grid]
    newGrid[index] = selectedColor
    setGrid(newGrid)
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

  const handleClear = () => {
      if (confirm('Clear canvas?')) {
          setGrid(Array(WIDTH * HEIGHT).fill('transparent'))
      }
  }

    return (
        <div className="p-4 border rounded bg-white shadow-sm">
            <h3 className="text-lg font-bold mb-4">Topic Skin Editor ({WIDTH}x{HEIGHT})</h3>
            
            <div className="mb-4">
                <input 
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter skin name..."
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                />
            </div>

            <div className="flex flex-col sm:flex-row gap-6 mb-6">
                {/* Canvas */}
                <div>
                    <div className="mb-2 text-sm text-gray-500">Click to paint</div>
                    <div 
                        className="grid gap-px bg-gray-200 border border-gray-300 shadow-inner select-none"
                        style={{ 
                            gridTemplateColumns: `repeat(${WIDTH}, 1fr)`,
                            width: 'fit-content'
                        }}
                    >
                        {grid.map((color, i) => (
                            <div
                                key={i}
                                onMouseDown={() => handlePixelClick(i)}
                                onMouseEnter={(e) => { if (e.buttons === 1) handlePixelClick(i) }}
                                onDragStart={(e) => e.preventDefault()}
                                className="w-3 h-3 cursor-pointer hover:opacity-90"
                                style={{ backgroundColor: color === 'transparent' ? 'white' : color }}
                                title={`Pixel ${i}`}
                            >
                                {color === 'transparent' && <div className="w-full h-full bg-gray-50 text-[5px] flex items-center justify-center text-gray-200">.</div>}
                            </div>
                        ))}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                        Canvas Size: {WIDTH}x{HEIGHT} (Matches Topic Card Ratio)
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Palette */}
                    <div className="flex flex-col gap-2">
                        <div className="font-bold text-sm">Palette (Neo-Chinese)</div>
                        <div className="grid grid-cols-4 gap-2">
                            {NEO_CHINESE_PALETTE.map(color => (
                                <div
                                    key={color.value}
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`
                                        w-8 h-8 rounded border cursor-pointer transition-transform hover:scale-105 relative
                                        ${selectedColor === color.value ? 'ring-2 ring-offset-1 ring-black scale-110' : ''}
                                    `}
                                    style={{ backgroundColor: color.value === 'transparent' ? 'white' : color.value }}
                                    title={color.name}
                                >
                                    {color.value === 'transparent' && (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">/</div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                            Selected: <span className="font-bold" style={{ color: selectedColor !== 'transparent' ? selectedColor : 'black' }}>
                                {NEO_CHINESE_PALETTE.find(c => c.value === selectedColor)?.name || selectedColor}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                        >
                            {loading ? 'Saving...' : 'Save Skin'}
                        </button>
                        <button
                            onClick={handleClear}
                            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 text-sm"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Saved Skins List */}
            <SkinList 
                skins={skins} 
                activeSkinId={activeSkinId} 
                onApply={async (id) => {
                    setLoading(true)
                    await setActiveSkin(id)
                    setActiveSkinId(id)
                    setLoading(false)
                }}
                onDelete={async (id) => {
                    if(!confirm('Delete?')) return
                    await deleteSkin(id)
                    loadSkins()
                }}
                onEdit={(skin) => {
                    if(confirm('Load skin? Unsaved changes will be lost.')) {
                        setName(skin.name)
                        try {
                             const data = JSON.parse(skin.pixelData)
                             if (data.length !== WIDTH * HEIGHT) {
                                const newGrid = Array(WIDTH * HEIGHT).fill('transparent')
                                data.forEach((c: string, i: number) => { if(i < newGrid.length) newGrid[i] = c })
                                setGrid(newGrid)
                             } else {
                                setGrid(data)
                             }
                        } catch(e) { console.error(e) }
                    }
                }}
            />
        </div>
    )
}

function SkinList({ skins, activeSkinId, onApply, onDelete, onEdit }: { 
    skins: Skin[], 
    activeSkinId: string | null,
    onApply: (id: string) => void,
    onDelete: (id: string) => void,
    onEdit: (skin: Skin) => void
}) {
    if (skins.length === 0) return <p className="text-gray-400 italic text-sm mt-4">No skins saved yet.</p>

    return (
        <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-bold mb-3">Saved Skins</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {skins.map(skin => (
                    <div key={skin.id} className={`border rounded p-3 flex flex-col gap-2 ${activeSkinId === skin.id ? 'border-green-500 ring-1 ring-green-500 bg-green-50' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-center">
                            <span className="font-medium truncate text-sm" title={skin.name}>{skin.name}</span>
                            {activeSkinId === skin.id && <span className="text-[10px] text-green-600 font-bold bg-green-100 px-1.5 py-0.5 rounded-full">Active</span>}
                        </div>
                        
                        <div className="w-full bg-gray-100 rounded overflow-hidden relative" style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}>
                            {(() => {
                                try {
                                    const pixels = JSON.parse(skin.pixelData)
                                    const displayWidth = pixels.length === 48 * 16 ? 48 : WIDTH
                                    return (
                                        <div className="w-full h-full grid" style={{ gridTemplateColumns: `repeat(${displayWidth}, 1fr)` }}>
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
                                onClick={() => onApply(skin.id)}
                                disabled={activeSkinId === skin.id}
                                className="flex-1 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 disabled:opacity-50 transition-colors"
                            >
                                {activeSkinId === skin.id ? 'Applied' : 'Apply'}
                            </button>
                            <button 
                                onClick={() => onEdit(skin)}
                                className="px-2 py-1 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded border border-gray-200"
                                title="Edit"
                            >
                                ✏️
                            </button>
                            <button 
                                onClick={() => onDelete(skin.id)}
                                className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded border border-red-200"
                                title="Delete"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
