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
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  ref?: React.RefObject<HTMLTextAreaElement | null>
}

export default function MentionTextarea({ 
  name, 
  placeholder, 
  defaultValue = '', 
  className, 
  required,
  maxLength,
  onCitationAdd,
  onKeyDown,
  ref
}: MentionTextareaProps) {
  const [value, setValue] = useState(defaultValue)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const internalRef = useRef<HTMLTextAreaElement>(null)
  
  // Use either the passed ref or the internal ref
  // This is a bit hacky but avoids forwardRef complexity for now if we just want to focus it
  // Ideally should use forwardRef
  useEffect(() => {
    if (ref && internalRef.current) {
        // @ts-ignore - we are syncing the refs
        ref.current = internalRef.current
    }
  }, [ref])

  const textareaRef = internalRef

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
    
    setMentionQuery('')
    setShowSuggestions(false)
  }

  const handleSelectSuggestion = (suggestion: any) => {
    if (!textareaRef.current) return

    // Find the @ symbol we are currently replacing
    const lastAtSymbol = value.lastIndexOf('@', cursorPosition - 1)
    if (lastAtSymbol === -1) return

    const beforeMention = value.substring(0, lastAtSymbol)
    const afterMention = value.substring(cursorPosition)
    
    // Insert the mention text. We use a format that is readable but unique enough.
    const mentionText = `@[${suggestion.author.username}: ${suggestion.summary.substring(0, 20)}...]`
    
    // Add a space after the mention
    const newValue = beforeMention + mentionText + ' ' + afterMention
    setValue(newValue)
    setShowSuggestions(false)
    setMentionQuery('')
    
    // Notify parent to add hidden citation ID
    if (onCitationAdd) {
      onCitationAdd(suggestion)
    }

    // Restore focus and set cursor after the inserted mention
    setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.focus()
            const newCursorPos = beforeMention.length + mentionText.length + 1 // +1 for space
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault()
        handleSelectSuggestion(suggestions[0])
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
      }
    } else if (onKeyDown) {
      onKeyDown(e)
    }
  }

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        // Handle click/keyup to update cursor position for mention detection
        onKeyUp={(e) => setCursorPosition(e.currentTarget.selectionStart)}
        onClick={(e) => setCursorPosition(e.currentTarget.selectionStart)}
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
