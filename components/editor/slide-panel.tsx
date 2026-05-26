'use client'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Slide } from '@/lib/deck/types'

interface SlidePanelProps {
  slides: Slide[]
  currentIndex: number
  onSelect: (index: number) => void
  onReorder: (newSlides: Slide[]) => void
  onAdd: () => void
  onDelete: (index: number) => void
}

function SortableSlideItem({
  slide, index, isActive, onSelect, onDelete,
}: {
  slide: Slide
  index: number
  isActive: boolean
  onSelect: (i: number) => void
  onDelete: (i: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: slide.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border p-1 ${isActive ? 'border-ko-orange' : 'border-[#222]'}`}
    >
      <div className="flex items-center gap-1 mb-1">
        <span
          {...attributes}
          {...listeners}
          className="text-[#444] cursor-grab text-[10px] select-none"
        >
          ⠿
        </span>
        <span className="font-mono text-[7px] text-[#555] flex-1">
          {String(index + 1).padStart(2, '0')}
        </span>
        <button
          aria-label={`delete slide ${index + 1}`}
          className="font-mono text-[7px] text-[#444] hover:text-red-500"
          onClick={(e) => { e.stopPropagation(); onDelete(index) }}
        >
          ✕
        </button>
      </div>
      <div
        className="h-14 relative overflow-hidden"
        style={{ backgroundColor: slide.background }}
        onClick={() => onSelect(index)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(index)}
      >
        <span className="font-mono text-[5px] text-ko-orange absolute top-1 left-1 pointer-events-none">
          {slide.label}
        </span>
      </div>
    </div>
  )
}

export function SlidePanel({ slides, currentIndex, onSelect, onReorder, onAdd, onDelete }: SlidePanelProps) {
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = slides.findIndex((s) => s.id === active.id)
    const newIdx = slides.findIndex((s) => s.id === over.id)
    onReorder(arrayMove(slides, oldIdx, newIdx))
  }

  return (
    <div className="w-[120px] bg-[#0a0a0a] border-r-2 border-[#1a1a1a] flex flex-col">
      <div className="p-2 border-b border-[#1a1a1a]">
        <p className="font-mono text-[8px] uppercase tracking-tight2 text-ko-orange">// Slides</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {slides.map((slide, i) => (
              <SortableSlideItem
                key={slide.id}
                slide={slide}
                index={i}
                isActive={i === currentIndex}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button
          className="w-full border border-dashed border-[#333] text-[#444] font-mono text-[8px] py-2 hover:border-[#555] hover:text-[#666]"
          onClick={onAdd}
        >
          + ADD SLIDE
        </button>
      </div>
    </div>
  )
}
