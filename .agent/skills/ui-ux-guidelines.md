---
description: UI/UX Design Guidelines for Idea Refinery
source: /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/SKILL.md
---

# UI/UX Guidelines for Idea Refinery

This project uses the **UI/UX Pro Max** skill for comprehensive design intelligence.

## Quick Access

The full skill documentation is located at:
```
/Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/SKILL.md
```

## How to Use

### 1. Generate Design System (REQUIRED for new features)

Always start with `--design-system` to get comprehensive recommendations:

```bash
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "idea refinery brainstorming creative" --design-system -p "Idea Refinery"
```

### 2. Persist Design System (Recommended)

To save the design system for hierarchical retrieval across sessions:

```bash
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "idea refinery brainstorming creative" --design-system --persist -p "Idea Refinery"
```

This creates:
- `design-system/MASTER.md` — Global Source of Truth
- `design-system/pages/` — Page-specific overrides

### 3. Domain-Specific Searches

Get detailed recommendations for specific aspects:

```bash
# UX best practices
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "animation accessibility" --domain ux

# Typography options
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "modern creative playful" --domain typography

# Color palettes
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "creative brainstorming" --domain color

# Style recommendations
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "glassmorphism modern" --domain style
```

### 4. Stack-Specific Guidelines

Get React-specific best practices (our stack):

```bash
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "layout responsive form" --stack react
```

## Priority Rules for Idea Refinery

### CRITICAL (Must Follow)
1. **Accessibility** - 4.5:1 color contrast, focus states, ARIA labels
2. **Touch & Interaction** - 44x44px touch targets, loading states, error feedback
3. **Performance** - WebP images, lazy loading, reduced motion support

### HIGH (Should Follow)
4. **Layout & Responsive** - Mobile-first, no horizontal scroll
5. **Typography & Color** - 1.5-1.75 line height, 65-75 char line length

### MEDIUM (Nice to Have)
6. **Animation** - 150-300ms micro-interactions, transform/opacity only
7. **Style Consistency** - Same style across all pages

## Pre-Delivery Checklist

Before committing UI changes, verify:

### Visual Quality
- [ ] No emojis as icons (use Lucide React instead)
- [ ] All icons from consistent set
- [ ] Hover states don't cause layout shift
- [ ] Theme colors used correctly

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible

### Light/Dark Mode
- [ ] Light mode text has 4.5:1 contrast minimum
- [ ] Glass/transparent elements visible in light mode
- [ ] Borders visible in both modes
- [ ] Both modes tested

### Layout
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile
- [ ] No content hidden behind fixed elements

### Accessibility
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] `prefers-reduced-motion` respected

## Common Anti-Patterns to Avoid

| Don't | Do Instead |
|-------|------------|
| Use emojis as UI icons (🎨 🚀) | Use Lucide React SVG icons |
| Use `bg-white/10` in light mode | Use `bg-white/80` or higher |
| Use gray-400 for body text | Use slate-600 minimum |
| Stick navbar to edges | Add spacing: `top-4 left-4 right-4` |
| Scale transforms on hover | Use color/opacity transitions |

## Available Domains

- `product` - Product type recommendations
- `style` - UI styles, colors, effects
- `typography` - Font pairings, Google Fonts
- `color` - Color palettes by product type
- `landing` - Page structure, CTA strategies
- `chart` - Chart types, library recommendations
- `ux` - Best practices, anti-patterns
- `react` - React/Next.js performance
- `web` - Web interface guidelines

## Quick Commands Reference

```bash
# Full path to search script
SEARCH="/Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py"

# Generate design system
python3 $SEARCH "query" --design-system -p "Idea Refinery"

# Persist design system
python3 $SEARCH "query" --design-system --persist -p "Idea Refinery"

# Domain search
python3 $SEARCH "query" --domain <domain>

# Stack guidelines
python3 $SEARCH "query" --stack react
```

## Integration with Development Workflow

1. **Before starting a new feature**: Generate design system
2. **During development**: Reference UX rules and stack guidelines
3. **Before committing**: Run through pre-delivery checklist
4. **Code review**: Verify accessibility and interaction standards

---

For complete documentation, view the full skill file:
```bash
cat /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/SKILL.md
```
