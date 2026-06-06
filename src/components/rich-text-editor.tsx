"use client"

import { useEditor, EditorContent, type Content } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Bold, Italic, List, ListOrdered } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCallback } from "react"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = "80px",
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    content: value as Content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (html === "<p></p>") {
        onChange("")
      } else {
        onChange(html)
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[inherit] px-3 py-2",
        placeholder: placeholder ?? "",
      },
    },
  })

  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor])
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor])
  const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor])
  const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor])

  if (!editor) return null

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background transition-colors focus-within:ring-1 focus-within:ring-ring",
        className,
      )}
      style={{ minHeight }}
    >
      <div className="flex items-center gap-0.5 border-b border-input/50 px-2 py-1.5">
        <button
          type="button"
          onClick={toggleBold}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            editor.isActive("bold") && "bg-muted text-foreground",
          )}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={toggleItalic}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            editor.isActive("italic") && "bg-muted text-foreground",
          )}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={toggleBulletList}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            editor.isActive("bulletList") && "bg-muted text-foreground",
          )}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={toggleOrderedList}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            editor.isActive("orderedList") && "bg-muted text-foreground",
          )}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
