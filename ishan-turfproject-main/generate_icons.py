import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

# 1. Create PWA App Icon SVG (Dark Sleek Background with Emerald Swoosh, Batsman & ELITE ARENA text)
pwa_icon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#09090b"/>
      <stop offset="100%" stop-color="#14532d"/>
    </linearGradient>
    <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#15803d"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Background Card -->
  <rect width="512" height="512" rx="100" fill="url(#bgGrad)"/>
  <rect width="504" height="504" x="4" y="4" rx="96" fill="none" stroke="#22c55e" stroke-width="4" stroke-opacity="0.4"/>

  <!-- Logo Mark (Centered Upper Half) -->
  <g transform="translate(146, 50)" filter="url(#shadow)">
    <!-- Green Swoosh -->
    <path d="M 45 105 C 30 45 110 20 165 45 C 195 59 208 92 190 130 C 175 162 130 188 85 190" 
          fill="none" stroke="url(#greenGrad)" stroke-width="18" stroke-linecap="round" />
    <!-- Batsman Silhouette (White) -->
    <circle cx="108" cy="90" r="12" fill="#ffffff" />
    <path d="M 100 102 C 90 110 82 122 78 138 L 92 142 L 105 115 L 128 128 L 135 120 Z" fill="#ffffff" />
    <path d="M 80 138 L 64 180 L 54 182 L 68 188 L 90 142 Z" fill="#ffffff" />
    <path d="M 100 136 L 110 178 L 102 182 L 118 186 L 112 138 Z" fill="#ffffff" />
    <!-- Green Bat -->
    <path d="M 128 120 L 58 70 L 67 62 L 136 110 Z" fill="url(#greenGrad)" />
  </g>

  <!-- ELITE ARENA Text (Centered Lower Half) -->
  <g transform="translate(256, 345)">
    <text x="0" y="0" text-anchor="middle" fill="#ffffff" font-family="Georgia, serif" font-weight="900" font-size="64" letter-spacing="4">ELITE</text>
    <text x="0" y="62" text-anchor="middle" fill="#22c55e" font-family="Georgia, serif" font-weight="900" font-size="50" letter-spacing="6">ARENA</text>
  </g>
</svg>
'''

with open('public/pwa-icon.svg', 'w') as f:
    f.write(pwa_icon_svg)

# Also update favicon.svg to match
with open('public/favicon.svg', 'w') as f:
    f.write(pwa_icon_svg)

print('SVG icon created successfully.')
