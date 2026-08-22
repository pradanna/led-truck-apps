# Design System & Engineering Guidelines - LED-FLX Mobile LED Control Platform

**Version:** 2.0.0  
**Target Aesthetic:** Clean Enterprise Light Mode (Clean Slate & White Surface, Slate-900 Typography)  
**Layout Rule:** Single Unified Navigation Sidebar per Auth Session (`resources/js/Components/Sidebar.jsx`)  
**Strict Policy:** Anti-AI Slop (No bloat, no fake decorative fluff, clean production-ready code)

---

## 1. Design Tokens & Color Palette

### 1.1 Core Brand & Surface Colors (Light Mode)
- **App Page Background:** `bg-slate-100` (`#F8FAFC` / `#F1F5F9`)
- **Card & Container Background:** `bg-white` (`#FFFFFF`) with subtle border `border-slate-100` / `border-slate-200`
- **Sidebar Background:** `#0B132B` (Dark Navy Brand Sidebar for clean contrast)
- **Header Surface:** `bg-white` with `border-b border-slate-200`

### 1.2 Text & Typography Palette
- **Primary Headings:** `text-slate-900` (`font-extrabold` / `font-bold`)
- **Body & Secondary Text:** `text-slate-700` / `text-slate-600`
- **Muted Labels & Captions:** `text-slate-500` / `text-slate-400`
- **Monospace (Telemetry, IDs, Timestamps):** `font-mono` (`text-slate-600` / `text-blue-600`)

### 1.3 Accent & Status Colors
- **Primary CTA / Active Pill:** `bg-blue-600 hover:bg-blue-700 text-white shadow-sm`
- **Success / Live / Playing (Green):** `bg-emerald-50 text-emerald-600 border border-emerald-200`
- **Active / Scheduled (Blue/Purple):** `bg-blue-100 text-blue-700` / `bg-purple-100 text-purple-700`
- **Warning / Alert (Amber):** `bg-amber-50 text-amber-700 border border-amber-200`
- **Danger / Error / Offline (Red):** `bg-rose-50 text-rose-600 border border-rose-200`

---

## 2. Structural Layout Rules

1. **Single Shared Sidebar**:
   - MUST use `<Sidebar activeMenu="..." />` from `resources/js/Components/Sidebar.jsx` on all pages.
   - Do NOT duplicate or embed inline sidebars inside individual page components.

2. **Clean Light Mode Workspace**:
   - Content area MUST be rendered in Light Mode (`bg-slate-100` page container, `bg-white` cards with `border border-slate-100` / `border-slate-200`).

---

## 3. Strict Anti-AI Slop Directives

1. **No Fake / Decorative Bloat**:
   - Do NOT inject fake mock data, filler decorative text, or hallucinated UI widgets when real data or clean error states are required.
   - If an API call fails or is unconfigured, render a clear, clean, transparent alert message — never hide it with fake mock imagery.

2. **Clean & Concise Codebase**:
   - Write clean, deterministic React & Laravel code.
   - Avoid deep nested loops, redundant wrappers, or unused state hooks.
