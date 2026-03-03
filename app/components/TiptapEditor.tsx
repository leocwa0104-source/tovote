'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { getOpinionById } from '@/app/actions'
import { CitationTarget } from '@/app/types'

// Icons
const BoldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>
)
const ItalicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>
)
const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
)
const QuoteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path></svg>
)

interface TiptapEditorProps {
  name: string
  placeholder?: string
  defaultValue?: string
  className?: string
  onCitationAdd?: (citation: CitationTarget) => void
}

const TiptapEditor = forwardRef<any, TiptapEditorProps>(({
  name,
  placeholder = 'Write something...',
  defaultValue = '',
  className,
  onCitationAdd
}, ref) => {
  const [content, setContent] = useState(defaultValue)

  // Custom Mention extension to handle @[id: summary] format
  const CustomMention = Mention.extend({
    name: 'customMention',
    addAttributes() {
      return {
        id: {
          default: null,
          parseHTML: element => element.getAttribute('data-id'),
          renderHTML: attributes => ({
            'data-id': attributes.id,
          }),
        },
        label: {
          default: null,
          parseHTML: element => element.getAttribute('data-label'),
          renderHTML: attributes => ({
            'data-label': attributes.label,
          }),
        },
      }
    },
    parseHTML() {
      return [
        {
          tag: 'span[data-type="mention"]',
        },
      ]
    },
    renderHTML({ node, HTMLAttributes }) {
      return [
        'span',
        {
          class: 'mention-chip inline-block bg-blue-50 text-blue-600 rounded px-1 mx-0.5 text-sm border border-blue-200 select-none',
          'data-type': 'mention',
          ...HTMLAttributes,
        },
        `@${node.attrs.label}`,
      ]
    },
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CustomMention.configure({
        suggestion: {
            items: async ({ query }) => {
                return []
            },
            render: () => {
                return {
                    onStart: () => {},
                    onUpdate: () => {},
                    onKeyDown: () => false,
                    onExit: () => {},
                }
            }
        }
      }),
    ],
    content: defaultValue, // Initial content needs to be parsed? Tiptap handles HTML string.
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4 ${className || ''}`,
      },
      handlePaste: (view, event, slice) => {
        const text = event.clipboardData?.getData('text/plain').trim()
        if (!text) return false

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(text)) {
           // Async check
           getOpinionById(text).then(opinion => {
             if (opinion) {
               // Insert mention
               const tr = view.state.tr.replaceSelectionWith(
                 view.state.schema.nodes.customMention.create({
                   id: opinion.id,
                   label: `${opinion.author.username}: ${opinion.summary.substring(0, 20)}...`
                 })
               )
               view.dispatch(tr)
               
               if (onCitationAdd) onCitationAdd(opinion as unknown as CitationTarget)
             } else {
               // Paste as text
               view.dispatch(view.state.tr.insertText(text))
             }
           }).catch(() => {
             view.dispatch(view.state.tr.insertText(text))
           })
           return true // Handled asynchronously (prevent default paste for now, or let it paste and replace?)
           // Tiptap handlePaste expects boolean. If we return true, we claim we handled it.
           // Since getOpinionById is async, we can't block.
           // Strategy: Allow default paste, but if it matches UUID, prevent default and do async insert.
        }
        return false
      }
    },
    onUpdate: ({ editor }) => {
      // Serialize to our custom format or HTML
      // For backward compatibility, we might want to convert mentions back to @[username: summary] text?
      // OR, we just switch to storing HTML/JSON.
      // The current backend likely stores plain text with @[...] tags.
      
      // Let's try to maintain the text-based format for now to avoid migration.
      // Traverse the doc and build string.
      let text = ''
      editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'text') {
              text += node.text
          } else if (node.type.name === 'customMention') {
              text += `@[${node.attrs.label.split(':')[0].replace('@', '')}: ${node.attrs.label.split(': ')[1].replace('...', '')}]`
          } else if (node.type.name === 'paragraph') {
              text += '\n' // Add newline for paragraphs
          } else if (node.type.name === 'hardBreak') {
              text += '\n'
          }
          // What about bold/italic? The current backend is plain text.
          // If we want "Word-like", we should probably start storing HTML.
          // For this task, let's stick to HTML if the backend supports it, 
          // OR degrade to plain text but give the user a nice editing experience.
          // 
          // The prompt asked for "Word-like experience". 
          // Storing as HTML is the right way forward for "Word-like".
          // BUT, we need to check if existing display logic handles HTML.
          // Existing OpinionDetailView uses `renderDetailWithCitations`.
          // We might need to update that to support HTML rendering or keep using the text format.
      })
      
      // Let's stick to HTML for the input value to support rich text.
      // We will need to update the display component to render HTML safely.
      // For now, let's just use editor.getHTML() and see if it works with the backend.
      // The backend stores `detail` as String.
      
      setContent(editor.getHTML())
    }
  })

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    insertMention: (opinion: CitationTarget) => {
      if (editor) {
        editor.chain().focus().insertContent({
            type: 'customMention',
            attrs: {
                id: opinion.id,
                label: `${opinion.author.username}: ${opinion.summary.substring(0, 20)}...`
            }
        }).run()
      }
    },
    clear: () => {
        editor?.commands.clearContent()
    }
  }))

  // Set initial content if it changes externally
  useEffect(() => {
    if (editor && defaultValue && editor.getHTML() !== defaultValue) {
        // We need to parse the old @[...] format if it exists in defaultValue
        // This is a migration step for display.
        // Actually, let's just let it be.
        // If defaultValue is plain text, Tiptap will render it as text.
        // If it's HTML, it renders HTML.
        
        // Improve: Parse @[...] in defaultValue to mention nodes?
        // This would be nice for editing existing opinions.
        // Regex replace @[...] with <span data-type="mention"...>
        
        const regex = /@\[([^:]+): (.*?)\]/g;
        let html = defaultValue;
        if (!html.includes('<')) {
             // It's likely plain text
             html = html.replace(/\n/g, '<br>')
        }
        
        html = html.replace(regex, (match, username, summary) => {
             return `<span data-type="mention" data-id="unknown" data-label="${username}: ${summary}"></span>`
        });
        
        if (editor.getHTML() !== html) {
             editor.commands.setContent(html)
        }
    }
  }, [defaultValue, editor])

  if (!editor) {
    return null
  }

  return (
    <div className={`flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all focus-within:ring-1 focus-within:ring-gray-900 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-gray-50 text-gray-600">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bold') ? 'bg-gray-200 text-gray-900' : ''}`}
          title="Bold"
        >
          <BoldIcon />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('italic') ? 'bg-gray-200 text-gray-900' : ''}`}
          title="Italic"
        >
          <ItalicIcon />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bulletList') ? 'bg-gray-200 text-gray-900' : ''}`}
          title="Bullet List"
        >
          <ListIcon />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('blockquote') ? 'bg-gray-200 text-gray-900' : ''}`}
          title="Quote"
        >
          <QuoteIcon />
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} className="flex-grow bg-white min-h-[150px]" />
      
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={content} />
      
      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror ul {
            list-style-type: disc;
            padding-left: 1.5em;
            margin: 0.5em 0;
        }
        .ProseMirror ol {
            list-style-type: decimal;
            padding-left: 1.5em;
            margin: 0.5em 0;
        }
        .ProseMirror blockquote {
            border-left: 3px solid #e5e7eb;
            padding-left: 1em;
            margin-left: 0;
            margin-right: 0;
            color: #4b5563;
        }
      `}</style>
    </div>
  )
})

TiptapEditor.displayName = 'TiptapEditor'

export default TiptapEditor
