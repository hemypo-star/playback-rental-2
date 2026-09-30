'use client'

// Shared drag-and-drop image uploader for every admin place that used to
// carry a raw <input type="file"> (product editor, kit editor, category
// form, promotion form, site-settings hero banners). One or several images
// can be dropped onto the zone or picked via click; files are uploaded
// sequentially through `upload` (multipart route handler / Payload media
// API — never a Server Action: RSC FormData serialization 500s on large
// images, React #418/#441 seen in production).
import { useRef, useState } from 'react'

interface Props {
  // Receives all successfully uploaded files of this drop/pick, in order.
  onFiles: (files: File[]) => Promise<void> | void
  upload?: boolean
  multiple?: boolean
  label?: string
  hint?: string
  className?: string
}

const IMAGE_RE = /^image\//

export default function ImageDropzone({
  onFiles,
  upload = false,
  multiple = true,
  label = '+ Добавить фото',
  hint = 'перетащите изображения сюда или нажмите для выбора',
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleFiles = async (list: FileList | null) => {
    if (!list || busy) return
    const files = Array.from(list).filter((f) => IMAGE_RE.test(f.type))
    if (files.length === 0) return
    setBusy(true)
    try {
      await onFiles(multiple ? files : files.slice(0, 1))
    } finally {
      setBusy(false)
      // Reset so dropping/picking the same file again re-fires change.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (!busy) inputRef.current?.click()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!busy) setDragging(true)
      }}
      onDragLeave={(e) => {
        // Ignore leave events bubbling from child elements.
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        void handleFiles(e.dataTransfer.files)
      }}
      className={`flex min-h-16 cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-3 text-center transition-colors ${
        dragging ? 'border-accent bg-accent/5 text-foreground' : 'border-input text-subtle'
      } ${busy ? 'pointer-events-none opacity-60' : 'hover:border-foreground hover:text-foreground'} ${className}`}
    >
      <span className="text-[13px] font-semibold">{busy ? 'Загрузка…' : label}</span>
      {!busy && hint ? <span className="text-[11px] leading-tight text-subtle">{hint}</span> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  )
}
