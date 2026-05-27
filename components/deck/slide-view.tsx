import type { SlideData, SlideElement } from '@/lib/deck/types'

function ElementRenderer({ el }: { el: SlideElement }) {
  if (el.type === 'text') {
    return (
      <p
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          fontSize: el.fontSize ? `${el.fontSize}px` : undefined,
          fontFamily: el.fontFamily === 'archivo-black' ? '"Archivo Black", sans-serif'
            : el.fontFamily === 'space-mono' ? '"Space Mono", monospace'
            : 'Inter, sans-serif',
          color: el.color ?? '#FFFFFF',
          textTransform: el.textTransform === 'uppercase' ? 'uppercase' : undefined,
          textAlign: el.textAlign ?? 'left',
          lineHeight: el.lineHeight ?? 1.2,
          margin: 0,
        }}
      >
        {el.content}
      </p>
    )
  }
  if (el.type === 'shape') {
    return (
      <div
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          background: el.fill ?? '#222',
          border: el.borderColor ? `${el.borderWidth ?? 1}px solid ${el.borderColor}` : undefined,
          borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
        }}
      />
    )
  }
  if (el.type === 'image' && el.storageKey) {
    return (
      <img
        src={el.storageKey}
        alt=""
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          objectFit: el.objectFit ?? 'cover',
        }}
      />
    )
  }
  return null
}

export function SlideView({ slides }: { slides: SlideData }) {
  return (
    <div className="space-y-1">
      {slides.map((slide) => (
        <div
          key={slide.id}
          className="relative overflow-hidden"
          style={{
            background: slide.background,
            paddingTop: '56.25%', // 16:9 aspect ratio
          }}
        >
          <div className="absolute inset-0">
            {[...slide.elements]
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((el) => (
                <ElementRenderer key={el.id} el={el} />
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
