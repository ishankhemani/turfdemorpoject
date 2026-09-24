import React from 'react'

interface EliteArenaLogoProps {
  className?: string
  iconOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function EliteArenaLogo({ className = '', iconOnly = false, size = 'md' }: EliteArenaLogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo Mark: Batsman with Green Swoosh Arc */}
      <div className={`relative flex items-center justify-center shrink-0 ${iconSizes[size]}`}>
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="eliteLogoGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
          </defs>
          {/* Green Swoosh Arc */}
          <path
            d="M 45 105 C 30 45 110 20 165 45 C 195 59 208 92 190 130 C 175 162 130 188 85 190"
            stroke="url(#eliteLogoGreenGrad)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Batsman Silhouette */}
          <circle cx="108" cy="90" r="11" fill="currentColor" />
          <path d="M 100 102 C 90 110 82 122 78 138 L 92 142 L 105 115 L 128 128 L 135 120 Z" fill="currentColor" />
          <path d="M 80 138 L 64 180 L 54 182 L 68 188 L 90 142 Z" fill="currentColor" />
          <path d="M 100 136 L 110 178 L 102 182 L 118 186 L 112 138 Z" fill="currentColor" />
          {/* Green Bat */}
          <path d="M 128 120 L 58 70 L 67 62 L 136 110 Z" fill="url(#eliteLogoGreenGrad)" />
        </svg>
      </div>

      {!iconOnly && (
        <div className="flex flex-col leading-none select-none">
          <span
            className={`font-black tracking-wider text-emerald-600 dark:text-emerald-500 uppercase ${textSizes[size]}`}
            style={{ fontFamily: "'Cinzel', Georgia, serif" }}
          >
            ELITE
          </span>
          <span
            className={`font-black tracking-widest text-emerald-600 dark:text-emerald-500 uppercase text-[0.7em] mt-0.5`}
            style={{ fontFamily: "'Cinzel', Georgia, serif" }}
          >
            ARENA
          </span>
        </div>
      )}
    </div>
  )
}
