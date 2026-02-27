'use client'

import { useState, useRef, useEffect } from 'react'
import { getOpinionById } from '@/app/actions'

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

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (onKeyDown) {
      onKeyDown(e)
    }
  }

  const insertMention = (opinion: any) => {
    if (!textareaRef.current) return

    const mentionText = `@[${opinion.author.username}: ${opinion.summary.substring(0, 20)}...]`
    const cursor = textareaRef.current.selectionStart
    
    const beforeCursor = value.substring(0, cursor)
    const afterCursor = value.substring(textareaRef.current.selectionEnd)
    
    const newValue = beforeCursor + mentionText + ' ' + afterCursor
    setValue(newValue)
    
    // Notify parent to add hidden citation ID
    if (onCitationAdd) {
      onCitationAdd(opinion)
    }

    // Set cursor position after the inserted mention
    setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.focus()
            const newCursorPos = cursor + mentionText.length + 1
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
    }, 0)
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text').trim()
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (uuidRegex.test(text)) {
      e.preventDefault()
      // Optimistically fetch opinion
      try {
        const opinion = await getOpinionById(text)
        if (opinion) {
          insertMention(opinion)
        } else {
          // Fallback to default paste if not found
          // Since we prevented default, we must insert manually
          const cursor = e.currentTarget.selectionStart
          const before = value.substring(0, cursor)
          const after = value.substring(e.currentTarget.selectionEnd)
          setValue(before + text + after)
          
          setTimeout(() => {
            if (textareaRef.current) {
              const newPos = cursor + text.length
              textareaRef.current.setSelectionRange(newPos, newPos)
            }
          }, 0)
        }
      } catch (err) {
        // Fallback
        const cursor = e.currentTarget.selectionStart
        const before = value.substring(0, cursor)
        const after = value.substring(e.currentTarget.selectionEnd)
        setValue(before + text + after)
      }
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
        onPaste={handlePaste}
        placeholder={placeholder}
        className={className}
        required={required}
        maxLength={maxLength}
      />
    </div>
  )
}
