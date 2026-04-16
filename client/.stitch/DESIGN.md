# Omni-SRE Design System

## Philosophy
Premium, clean, Google-Antigravity-inspired aesthetic. Pure white canvas with colorful confetti energy. Every interaction feels magnetic and alive.

## Colors

### Base
- **Background**: `#ffffff` (pure white)
- **Text Primary**: `#0a0a0a` (near black)
- **Text Secondary**: `#6b7280` (gray-500)
- **Text Muted**: `#9ca3af` (gray-400)
- **Text Dim**: `#d1d5db` (gray-300)

### Accent Colors
- **Green (Reliability)**: `#10b981`
- **Blue (Reviews)**: `#3b82f6`
- **Red (Critical)**: `#ef4444`
- **Purple (Intelligence)**: `#8b5cf6`

### Confetti Palette
- Red: `#ef4444`
- Blue: `#3b82f6`
- Yellow: `#f59e0b`
- Green: `#10b981`
- Purple: `#8b5cf6`

## Typography
- **Font Family**: `Inter` (Google Fonts)
- **Headings**: 700–900 weight, large sizes
- **Body**: 400–500 weight
- **Mono**: `JetBrains Mono` for code

## Buttons
- **Primary (Dark Pill)**: `background: #0a0a0a`, `color: #ffffff`, `border-radius: 999px`, smooth hover scale
- **Ghost**: transparent bg, colored text, pill shape
- **Danger**: red text, red/10 bg on hover

## Cards (Glassmorphism)
- `background: rgba(255, 255, 255, 0.7)`
- `backdrop-filter: blur(12px)`
- `border: 1px solid rgba(0, 0, 0, 0.06)`
- `border-radius: 20px`
- `box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06)`
- **3D Tilt**: CSS perspective transform on hover via `useMouseGlow` hook

## Interactions
- **Cursor Glow**: Radial gradient circle (blue hue) follows mouse across every page
- **Confetti Particles**: ~60 small colorful dashes floating slowly in all directions (like Google Antigravity)
- **Hover Scale**: All buttons scale 1.03 on hover
- **Card Tilt**: 3D perspective tilt on mouse move over cards
- **Transitions**: 200–300ms ease

## Scrollbar
- Thin (6px), light track, blue thumb

## Layout
- **Sidebar**: 260px wide, white bg, light right border
- **Main Content**: White, max-width 1200px, centered
- **Stat Cards**: 4-column grid with colored left accent borders
