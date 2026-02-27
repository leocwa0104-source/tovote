'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { getOpinionById } from '@/app/actions'

interface CitationTarget {
  id: string
  summary: string
  detail: string | null
  type: 'WHY' | 'WHY_NOT'
  author: {
    username: string
  }
  faction: {
    name: string
    topic: {
      title: string
    }
  }
}

interface MentionTextareaProps {
  name: string
  placeholder: string
  defaultValue?: string
  className?: string
  required?: boolean
  maxLength?: number
  onCitationAdd?: (citation: CitationTarget) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void
  ref?: React.RefObject<HTMLDivElement | null>
}

// Helper to convert text with @[username: summary] to HTML
const textToHtml = (text: string) => {
  if (!text) return '';
  const regex = /@\[([^:]+): (.*?)\]/g;
  let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  html = html.replace(regex, (match, username, summary) => {
    // We store the original match as a data attribute to reconstruct it later easily
    // but here we just need to reconstruct the visual chip
    const summaryText = summary.length > 20 ? summary.substring(0, 20) + '...' : summary;
    return `<span class="mention-chip" contenteditable="false" data-full-text="${match.replace(/"/g, '&quot;')}">@${username}: ${summaryText}</span>`;
  });
  
  // Replace newlines with <br> for display
  return html.replace(/\n/g, '<br>');
}

// Helper to convert HTML content back to text format
const htmlToText = (element: HTMLElement) => {
  let text = '';
  
  const traverse = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.classList.contains('mention-chip')) {
        text += el.getAttribute('data-full-text') || '';
      } else if (el.tagName === 'BR') {
        text += '\n';
      } else if (el.tagName === 'DIV') {
         // Divs usually imply newlines in contentEditable
         if (text.length > 0 && !text.endsWith('\n')) text += '\n';
         el.childNodes.forEach(traverse);
      } else {
        el.childNodes.forEach(traverse);
      }
    }
  }
  
  element.childNodes.forEach(traverse);
  return text;
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
  const internalRef = useRef<HTMLDivElement>(null)
  
  // Use either the passed ref or the internal ref
  useEffect(() => {
    if (ref && internalRef.current) {
      ;(ref as React.MutableRefObject<HTMLDivElement | null>).current = internalRef.current
    }
  }, [ref])

  const divRef = internalRef

  // Initialize content on mount
  useEffect(() => {
    if (divRef.current) {
      // Only set initial HTML if it's empty to avoid overwriting user input during re-renders if any
      if (divRef.current.innerHTML === '') {
        divRef.current.innerHTML = textToHtml(defaultValue);
      }
    }
  }, [defaultValue])

  const handleInput = useCallback(() => {
    if (!divRef.current) return;
    const newText = htmlToText(divRef.current);
    setValue(newText);
  }, [])

  const handleKeyDownHandler = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onKeyDown) {
      onKeyDown(e)
    }
  }

  const insertMentionChip = (opinion: CitationTarget) => {
    if (!divRef.current) return

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Check if selection is inside our editor
    if (!divRef.current.contains(range.commonAncestorContainer)) return;

    range.deleteContents();

    const mentionText = `@[${opinion.author.username}: ${opinion.summary.substring(0, 20)}...]`
    const chip = document.createElement('span');
    chip.className = 'mention-chip';
    chip.contentEditable = 'false';
    chip.setAttribute('data-full-text', mentionText);
    chip.textContent = `@${opinion.author.username}: ${opinion.summary.substring(0, 20)}...`;
    
    // Style the chip directly or via className (which we'll add to global CSS or component)
    chip.style.backgroundColor = '#eff6ff'; // bg-blue-50
    chip.style.color = '#2563eb'; // text-blue-600
    chip.style.borderRadius = '0.25rem'; // rounded
    chip.style.padding = '0 0.25rem'; // px-1
    chip.style.margin = '0 0.125rem'; // mx-0.5
    chip.style.display = 'inline-block';
    chip.style.userSelect = 'none';
    chip.style.border = '1px solid #bfdbfe'; // border-blue-200
    chip.style.fontSize = '0.9em';

    range.insertNode(chip);
    
    // Insert a space after the chip
    const space = document.createTextNode('\u00A0');
    range.setStartAfter(chip);
    range.insertNode(space);
    
    // Move cursor after space
    range.setStartAfter(space);
    range.collapse(true);
    
    selection.removeAllRanges();
    selection.addRange(range);

    // Update state
    handleInput();
    
    // Notify parent
    if (onCitationAdd) {
      onCitationAdd(opinion)
    }
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').trim()
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (uuidRegex.test(text)) {
      try {
        const opinion = await getOpinionById(text)
        if (opinion) {
          insertMentionChip(opinion as CitationTarget)
        } else {
          insertTextAtCursor(text);
        }
      } catch (_err) {
        insertTextAtCursor(text);
      }
    } else {
      // Plain text paste
      insertTextAtCursor(e.clipboardData.getData('text'));
    }
  }

  const insertTextAtCursor = (text: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    handleInput();
  }

  return (
    <div className="relative w-full">
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDownHandler}
        onPaste={handlePaste}
        className={`${className} focus:outline-none whitespace-pre-wrap`}
        style={{ minHeight: '120px' }} // Ensure it has height
        role="textbox"
        aria-multiline="true"
        aria-placeholder={placeholder}
      />
      {/* CSS for empty placeholder */}
      <style jsx>{`
        div[contenteditable]:empty::before {
          content: attr(aria-placeholder);
          color: #9ca3af; /* text-gray-400 */
          pointer-events: none;
        }
      `}</style>
      
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value} />
    </div>
  )
}
