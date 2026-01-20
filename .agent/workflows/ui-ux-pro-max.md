---
description: Apply UI/UX Pro Max design guidelines to features
---

# UI/UX Pro Max Workflow

Use this workflow when designing or reviewing UI/UX for Idea Refinery.

## Prerequisites

Ensure Python 3 is installed:
```bash
python3 --version
```

## Step 1: Generate Design System (For New Features)

// turbo
Before implementing a new feature or page, generate a design system:

```bash
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "idea refinery brainstorming creative productivity" --design-system -p "Idea Refinery"
```

## Step 2: Persist Design System (Optional but Recommended)

// turbo
To save the design system for future reference:

```bash
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "idea refinery brainstorming creative productivity" --design-system --persist -p "Idea Refinery"
```

This creates:
- `design-system/MASTER.md` - Global design rules
- `design-system/pages/` - Page-specific overrides

## Step 3: Get Domain-Specific Guidance (As Needed)

### UX Best Practices
```bash
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "animation accessibility touch" --domain ux
```

### Typography Recommendations
```bash
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "modern creative playful" --domain typography
```

### Color Palette Options
```bash
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "creative brainstorming productivity" --domain color
```

### Style Recommendations
```bash
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "glassmorphism modern minimalist" --domain style
```

## Step 4: Get React-Specific Guidelines

// turbo
For React implementation best practices:

```bash
python3 /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py "layout responsive form hooks state" --stack react
```

## Step 5: Implement the Design

Follow the recommendations from the design system and domain searches.

## Step 6: Pre-Delivery Checklist

Before committing, verify:

### Visual Quality
- [ ] No emojis as icons (use Lucide React)
- [ ] All icons from consistent set
- [ ] Hover states don't cause layout shift
- [ ] Theme colors used correctly

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

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
- [ ] Color is not the only indicator
- [ ] `prefers-reduced-motion` respected

## Quick Reference

Full skill documentation:
```bash
cat /Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/SKILL.md
```

Local guidelines:
```bash
cat /Users/mkgbuilds/Sites/Local\ Development/Idea-Refinery/.agent/skills/ui-ux-guidelines.md
```

## Common Commands

```bash
# Set search script path for convenience
SEARCH="/Users/mkgbuilds/.gemini/global_skills/ui-ux-pro-max/skills/ui-ux-pro-max/scripts/search.py"

# Generate design system
python3 $SEARCH "query" --design-system -p "Idea Refinery"

# Domain search
python3 $SEARCH "query" --domain ux

# Stack guidelines
python3 $SEARCH "query" --stack react
```
