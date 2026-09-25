import os

# 1. Exact SVG Logo (matching PDF layout: Batsman silhouette + Swoosh + ELITE ARENA)
exact_logo_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 320" width="650" height="320">
  <!-- Batsman + Green Swoosh Mark -->
  <g transform="translate(10, 20)">
    <!-- Green Swoosh Arc -->
    <path d="M 125 35 C 45 15 25 110 80 145 C 130 175 165 115 155 65 C 148 30 110 20 90 28 C 70 36 62 52 75 62 C 85 70 102 65 102 50 C 102 38 90 32 82 35" 
          fill="none" stroke="#059669" stroke-width="16" stroke-linecap="round"/>
    
    <!-- Black Batsman Silhouette -->
    <!-- Head with Helmet -->
    <circle cx="108" cy="72" r="14" fill="#09090b"/>
    <path d="M 98 68 C 96 64 100 58 112 58 C 122 58 126 66 122 72 Z" fill="#059669"/>
    
    <!-- Body & Arms -->
    <path d="M 98 84 C 88 96 80 112 76 132 L 92 136 L 106 108 L 130 120 L 138 110 Z" fill="#09090b"/>
    <!-- Back Leg -->
    <path d="M 76 132 L 58 182 L 46 184 L 62 190 L 86 138 Z" fill="#09090b"/>
    <!-- Front Leg (Pads) -->
    <path d="M 98 130 L 110 180 L 100 184 L 120 188 L 112 132 Z" fill="#09090b"/>
    <!-- Bat extended up-left -->
    <path d="M 130 110 L 48 48 L 58 38 L 140 100 Z" fill="#09090b"/>
  </g>

  <!-- Bold Serif Text: ELITE -->
  <text x="210" y="165" fill="#059669" font-family="'Cinzel', 'Georgia', 'Clarendon', serif" font-weight="900" font-size="140" letter-spacing="4">ELITE</text>

  <!-- Bold Serif Text: ARENA -->
  <text x="440" y="255" text-anchor="middle" fill="#059669" font-family="'Cinzel', 'Georgia', 'Clarendon', serif" font-weight="900" font-size="82" letter-spacing="6">ARENA</text>
</svg>
'''

# 2. Square PWA Icon SVG (Centered Mark & Text on sleek dark background)
pwa_square_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="100" fill="#09090b"/>
  <rect width="500" height="500" x="6" y="6" rx="94" fill="none" stroke="#059669" stroke-width="4" stroke-opacity="0.5"/>

  <!-- Logo Mark (Centered Top) -->
  <g transform="translate(68, 30) scale(1.35)">
    <!-- Green Swoosh Arc -->
    <path d="M 125 35 C 45 15 25 110 80 145 C 130 175 165 115 155 65 C 148 30 110 20 90 28 C 70 36 62 52 75 62 C 85 70 102 65 102 50 C 102 38 90 32 82 35" 
          fill="none" stroke="#10b981" stroke-width="16" stroke-linecap="round"/>
    
    <!-- White Batsman Silhouette for dark PWA background -->
    <circle cx="108" cy="72" r="14" fill="#ffffff"/>
    <path d="M 98 68 C 96 64 100 58 112 58 C 122 58 126 66 122 72 Z" fill="#10b981"/>
    
    <path d="M 98 84 C 88 96 80 112 76 132 L 92 136 L 106 108 L 130 120 L 138 110 Z" fill="#ffffff"/>
    <path d="M 76 132 L 58 182 L 46 184 L 62 190 L 86 138 Z" fill="#ffffff"/>
    <path d="M 98 130 L 110 180 L 100 184 L 120 188 L 112 132 Z" fill="#ffffff"/>
    <path d="M 130 110 L 48 48 L 58 38 L 140 100 Z" fill="#ffffff"/>
  </g>

  <!-- ELITE ARENA Text -->
  <text x="256" y="360" text-anchor="middle" fill="#ffffff" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="78" letter-spacing="4">ELITE</text>
  <text x="256" y="440" text-anchor="middle" fill="#10b981" font-family="'Cinzel', 'Georgia', serif" font-weight="900" font-size="54" letter-spacing="8">ARENA</text>
</svg>
'''

# Save SVGs
os.makedirs('public', exist_ok=True)
with open('public/logo.svg', 'w') as f:
    f.write(exact_logo_svg)

with open('public/favicon.svg', 'w') as f:
    f.write(pwa_square_svg)

with open('public/pwa-icon.svg', 'w') as f:
    f.write(pwa_square_svg)

print("SVGs written successfully.")
