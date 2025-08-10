'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
  variant?: 'chat' | 'default'
}

export function MarkdownRenderer({ 
  content, 
  className,
  variant = 'default'
}: MarkdownRendererProps) {
  const isChatVariant = variant === 'chat'
  
  const baseClasses = 'prose max-w-none'
  const chatClasses = isChatVariant ? 
    ' prose-sm prose-p:my-1 prose-p:leading-relaxed prose-ul:my-2 prose-li:my-0.5 prose-strong:text-current prose-strong:font-semibold prose-em:text-current prose-em:italic prose-headings:my-1 prose-headings:font-medium prose-gray dark:prose-invert' : 
    ''
  const finalClassName = `${baseClasses}${chatClasses}${className ? ` ${className}` : ''}`

  return (
    <div className={finalClassName}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
      components={{
        // Custom components for chat-optimized rendering
        p: ({ children, ...props }) => (
          <p 
            className={isChatVariant ? 'mb-2 last:mb-0' : ''} 
            {...props}
          >
            {children}
          </p>
        ),
        ul: ({ children, ...props }) => (
          <ul 
            className={`list-disc ${isChatVariant ? 'pl-4 mb-2 space-y-1' : 'pl-6 mb-4'}`} 
            {...props}
          >
            {children}
          </ul>
        ),
        ol: ({ children, ...props }) => (
          <ol 
            className={`list-decimal ${isChatVariant ? 'pl-4 mb-2 space-y-1' : 'pl-6 mb-4'}`} 
            {...props}
          >
            {children}
          </ol>
        ),
        li: ({ children, ...props }) => (
          <li 
            className={isChatVariant ? 'leading-relaxed' : ''}
            {...props}
          >
            {children}
          </li>
        ),
        strong: ({ children, ...props }) => (
          <strong 
            className={`font-semibold ${isChatVariant ? 'text-current' : ''}`}
            {...props}
          >
            {children}
          </strong>
        ),
        em: ({ children, ...props }) => (
          <em 
            className={`italic ${isChatVariant ? 'text-current opacity-90' : ''}`}
            {...props}
          >
            {children}
          </em>
        ),
        // Disable potentially problematic elements for chat
        h1: isChatVariant ? 
          ({ children, ...props }) => (
            <div className="font-medium mb-1" {...props}>{children}</div>
          ) : undefined,
        h2: isChatVariant ? 
          ({ children, ...props }) => (
            <div className="font-medium mb-1" {...props}>{children}</div>
          ) : undefined,
        h3: isChatVariant ? 
          ({ children, ...props }) => (
            <div className="font-medium mb-1" {...props}>{children}</div>
          ) : undefined,
        // Prevent images and links in chat for security
        img: isChatVariant ? () => null : undefined,
        a: isChatVariant ? 
          ({ children, ...props }) => (
            <span className="underline" {...props}>{children}</span>
          ) : undefined,
        // Handle code blocks in chat
        code: ({ children, className, ...props }) => {
          const isInlineCode = !className
          return isInlineCode ? (
            <code 
              className={`px-1 py-0.5 rounded text-xs font-mono ${
                isChatVariant ? 'bg-black/5 text-current' : 'bg-gray-100'
              }`}
              {...props}
            >
              {children}
            </code>
          ) : (
            <pre className={`p-2 rounded text-xs font-mono overflow-x-auto ${
              isChatVariant ? 'bg-black/5' : 'bg-gray-100'
            }`}>
              <code {...props}>{children}</code>
            </pre>
          )
        }
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}