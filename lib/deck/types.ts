export type SlideElementType = 'text' | 'image' | 'shape'

export interface SlideElement {
  id: string
  type: SlideElementType
  x: number        // % of slide width (0–100)
  y: number        // % of slide height (0–100)
  w: number        // % of slide width (0–100)
  h: number        // % of slide height (0–100)
  zIndex: number

  // text
  content?: string
  fontSize?: number
  fontFamily?: 'archivo-black' | 'space-mono' | 'inter'
  fontWeight?: number
  color?: string
  textTransform?: 'none' | 'uppercase'
  textAlign?: 'left' | 'center' | 'right'
  lineHeight?: number

  // image
  storageKey?: string
  objectFit?: 'cover' | 'contain'

  // shape
  fill?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
}

export interface Slide {
  id: string
  label: string
  background: string
  elements: SlideElement[]
}

export type SlideData = Slide[]
