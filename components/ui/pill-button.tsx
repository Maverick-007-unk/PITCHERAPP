import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline'
}

export function PillButton({ variant = 'primary', className, children, ...props }: PillButtonProps) {
  return (
    <button
      className={cn(
        'rounded-full border-2 font-mono text-[10px] uppercase tracking-tight2 px-4 py-1.5 font-bold transition-transform hover:scale-105',
        variant === 'primary' && 'bg-ko-orange border-ko-orange text-ko-black',
        variant === 'outline' && 'bg-transparent border-ko-white/30 text-ko-white',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
