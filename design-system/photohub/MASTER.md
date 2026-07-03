# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** PhotoHub
**Generated:** 2026-07-02 22:09:40
**Category:** Photography Studio

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#FFFFFF` | `--color-primary` |
| Secondary | `#E2E8F0` | `--color-secondary` |
| CTA/Accent | `#0F172A` | `--color-cta` |
| Background | `#F8FAFC` | `--color-background` |
| Text | `#0F172A` | `--color-text` |

**Color Notes:** Premium editorial light theme (Stark minimalist light mode)

### Typography

- **Heading Font:** Fira Code
- **Body Font:** Fira Sans
- **Mood:** dashboard, data, analytics, code, technical, precise
- **Google Fonts:** [Fira Code + Fira Sans](https://fonts.google.com/share?selection.family=Fira+Code:wght@400;500;600;700|Fira+Sans:wght@300;400;500;600;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(15,23,42,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(15,23,42,0.08)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(15,23,42,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(15,23,42,0.12)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button (Slate 900 on White) */
.btn-primary {
  background: #0F172A;
  color: #FFFFFF;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
  border: none;
}

.btn-primary:hover {
  background: #1E293B;
  transform: translateY(-1px);
}

/* Secondary Button (Outline Slate 200) */
.btn-secondary {
  background: transparent;
  color: #0F172A;
  border: 1px solid #E2E8F0;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #F8FAFC;
  border-color: #CBD5E1;
  transform: translateY(-1px);
}
```

### Cards

```css
.card {
  background: #FFFFFF; /* Elevated white */
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
  color: #0F172A;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  border-color: #CBD5E1;
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  background: #FFFFFF;
  color: #0F172A;
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 200ms ease;
}

.input:focus {
  border-color: #0F172A;
  outline: none;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.05);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
}

.modal {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
  color: #0F172A;
}
```

---

## Style Guidelines

**Style:** Exaggerated Minimalism

**Keywords:** Bold minimalism, oversized typography, high contrast, negative space, loud minimal, statement design

**Best For:** Fashion, architecture, portfolios, agency landing pages, luxury brands, editorial

**Key Effects:** font-size: clamp(3rem 10vw 12rem), font-weight: 900, letter-spacing: -0.05em, massive whitespace

### Page Pattern

**Pattern Name:** App Store Style Landing

- **Conversion Strategy:** Show real screenshots. Include ratings (4.5+ stars). QR code for mobile. Platform-specific CTAs.
- **CTA Placement:** Download buttons prominent (App Store + Play Store) throughout
- **Section Order:** 1. Hero with device mockup, 2. Screenshots carousel, 3. Features with icons, 4. Reviews/ratings, 5. Download CTAs

---

## Anti-Patterns (Do NOT Use)

- ❌ Heavy text
- ❌ Poor image showcase

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
