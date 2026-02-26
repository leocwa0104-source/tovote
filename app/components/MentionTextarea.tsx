'use client'

import { useState, useRef, useEffect } from 'react'
import { searchOpinions } from '@/app/actions'
import { useDebounce } from 'use-debounce'

interface MentionTextareaProps {
  name: string
  placeholder: string
  defaultValue?: string
  className?: string
  required?: boolean
  maxLength?: number
  onCitationAdd?: (citation: any) => void
}

export default function MentionTextarea({ 
  name, 
  placeholder, 
  defaultValue = '', 
  className, 
  required,
  maxLength,
  onCitationAdd 
}: MentionTextareaProps) {
  const [value, setValue] = useState(defaultValue)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Debounce the search query
  const [debouncedQuery] = useDebounce(mentionQuery, 300)

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      searchOpinions(debouncedQuery).then(results => {
        setSuggestions(results)
        setShowSuggestions(true)
      })
    } else {
      setShowSuggestions(false)
    }
  }, [debouncedQuery])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    
    const selectionStart = e.target.selectionStart
    setCursorPosition(selectionStart)

    // Check if we are typing a mention
    const lastAtSymbol = newValue.lastIndexOf('@', selectionStart - 1)
    
    if (lastAtSymbol !== -1) {
      // Check if there are spaces between @ and cursor, which might mean we are not mentioning anymore
      // actually spaces are allowed in search queries, but let's restrict to reasonable length
      const query = newValue.substring(lastAtSymbol + 1, selectionStart)
      
      // Simple heuristic: if query contains newline, abort
      if (!query.includes('\n')) {
        setMentionQuery(query)
        return
      }
    }
    
    setShowSuggestions(false)
  }

  const handleSelectSuggestion = (suggestion: any) => {
    if (!textareaRef.current) return

    const lastAtSymbol = value.lastIndexOf('@', cursorPosition - 1)
    if (lastAtSymbol === -1) return

    const beforeMention = value.substring(0, lastAtSymbol)
    const afterMention = value.substring(cursorPosition)
    
    // Insert the mention text. We use a format that is readable but unique enough.
    // For now, let's just use the summary or author.
    // Ideally, we might want a specific format like @[User: Summary]
    const mentionText = `@[${suggestion.author.username}: ${suggestion.summary.substring(0, 20)}...]`
    
    const newValue = beforeMention + mentionText + ' ' + afterMention
    setValue(newValue)
    setShowSuggestions(false)
    
    // Notify parent to add hidden citation ID
    if (onCitationAdd) {
      onCitationAdd(suggestion)
    }

    // Restore focus
    textareaRef.current.focus()
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={handleInput}
        placeholder={placeholder}
        className={className}
        required={required}
        maxLength={maxLength}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0"
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-xs text-gray-700">@{suggestion.author.username}</span>
                <span className="text-[10px] text-gray-500 bg-gray-100 px-1 rounded">
                  {suggestion.faction.topic.title}
                </span>
              </div>
              <p className="text-sm text-gray-600 truncate">{suggestion.summary}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
