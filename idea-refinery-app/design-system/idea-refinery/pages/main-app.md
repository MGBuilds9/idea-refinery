# Main App Design Overrides

> **Page:** Main Application (All Views)
> **Overrides:** Color palette, typography, and theme direction from MASTER.md

---

## Color Palette (Light Mode Primary)

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Primary | `#3B82F6` | `--color-primary` | Links, active states, primary actions |
| Secondary | `#60A5FA` | `--color-secondary` | Hover states, secondary elements |
| CTA/Accent | `#F97316` | `--color-cta` | Primary buttons, important CTAs |
| Background | `#F8FAFC` | `--color-background` | Main background |
| Surface | `#FFFFFF` | `--color-surface` | Cards, panels |
| Text | `#1E293B` | `--color-text` | Primary text |
| Text Muted | `#64748B` | `--color-text-muted` | Secondary text |
| Border | `#E2E8F0` | `--color-border` | Borders, dividers |

## Dark Mode Palette (Secondary)

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Background | `#0F172A` | `--color-dark-background` |
| Surface | `#1E293B` | `--color-dark-surface` |
| Text | `#F1F5F9` | `--color-dark-text` |
| Text Muted | `#94A3B8` | `--color-dark-text-muted` |
| Border | `#334155` | `--color-dark-border` |

## Typography

- **Heading Font:** Fredoka (400, 500, 600, 700)
- **Body Font:** Nunito (300, 400, 500, 600, 700)
- **Mono Font:** IBM Plex Mono (400, 500, 600)

## Component Overrides

### Buttons

```css
/* Primary CTA Button */
.btn-primary {
  background: #F97316;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-family: 'Nunito', sans-serif;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
}

.btn-primary:hover {
  background: #EA580C;
}

.btn-primary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.3);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #3B82F6;
  border: 2px solid #3B82F6;
  padding: 12px 24px;
  border-radius: 8px;
  font-family: 'Nunito', sans-serif;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
}

.btn-secondary:hover {
  background: #EFF6FF;
}
```

### Cards

```css
.card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: 0 10px 15px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  font-family: 'Nunito', sans-serif;
  background: white;
  color: #1E293B;
  transition: border-color 200ms ease;
  min-height: 44px;
}

.input:focus {
  border-color: #3B82F6;
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.input::placeholder {
  color: #94A3B8;
}
```

## Spacing Scale

Use these tokens for consistent spacing:

- `--space-xs`: 4px (0.25rem)
- `--space-sm`: 8px (0.5rem)
- `--space-md`: 16px (1rem)
- `--space-lg`: 24px (1.5rem)
- `--space-xl`: 32px (2rem)
- `--space-2xl`: 48px (3rem)
- `--space-3xl`: 64px (4rem)

## Shadow Depths

- `--shadow-sm`: 0 1px 2px rgba(0,0,0,0.05)
- `--shadow-md`: 0 4px 6px rgba(0,0,0,0.1)
- `--shadow-lg`: 0 10px 15px rgba(0,0,0,0.1)
- `--shadow-xl`: 0 20px 25px rgba(0,0,0,0.15)

## Animation Timing

All transitions should use:
- **Duration:** 150-200ms
- **Easing:** ease or cubic-bezier(0.2, 0.8, 0.2, 1)

## Accessibility Requirements

- Minimum contrast ratio: 4.5:1 for normal text
- Minimum touch target: 44x44px
- Visible focus states on all interactive elements
- Respect `prefers-reduced-motion`

---

**Notes:** This page-specific override shifts the entire app from dark mode to light mode as the primary theme, with dark mode as an optional toggle.
