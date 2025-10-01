'use client'

import { useMemo } from 'react'

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const renderedContent = useMemo(() => {
    let html = content
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-white mb-2 mt-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-white mb-2 mt-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-white mb-3 mt-2">$1</h1>')
      
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-300">$1</em>')
      
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-white/5 p-4 rounded-lg text-gray-200 text-xs overflow-x-auto mb-3 border border-white/10"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-white/10 text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
      
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-2 border-blue-400 pl-4 text-gray-300 italic mb-3 bg-white/5 py-2 rounded-r-lg">$1</blockquote>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Simple lists - convert to HTML lists
      .replace(/^(\*|\-|\d+\.) (.*$)/gim, '<li class="text-gray-200 leading-relaxed mb-1">$2</li>')
      
      // Wrap consecutive list items
      .replace(/(<li class="text-gray-200 leading-relaxed mb-1">.*?<\/li>)/g, (match) => {
        const lines = match.split('\n')
        const listItems = lines.filter(line => line.includes('<li class="text-gray-200 leading-relaxed mb-1">'))
        if (listItems.length > 1) {
          return `<ul class="list-disc list-inside text-gray-200 mb-3 space-y-1 ml-2">${listItems.join('')}</ul>`
        }
        return match
      })
      
      // Line breaks
      .replace(/\n\n/g, '</p><p class="text-gray-200 mb-3 last:mb-0 leading-relaxed">')
      .replace(/\n/g, '<br>')
      
      // Wrap in paragraph if not already wrapped
      .replace(/^(?!<[h|p|u|o|b|p|d])/gm, '<p class="text-gray-200 mb-3 last:mb-0 leading-relaxed">')
      .replace(/(?<!>)$/gm, '</p>')
      
      // Clean up empty paragraphs
      .replace(/<p class="text-gray-200 mb-3 last:mb-0 leading-relaxed"><\/p>/g, '')
      .replace(/<p class="text-gray-200 mb-3 last:mb-0 leading-relaxed"><br><\/p>/g, '')

    return html
  }, [content])

  return (
    <div 
      className="text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  )
}
