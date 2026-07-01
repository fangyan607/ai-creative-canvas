# Phase 7: Application UI — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 07-application-ui
**Areas discussed:** App Shell & Navigation, Project Management & Export, Settings & Dark Mode, Deferred Features & Keyboard Shortcuts

---

## App Shell & Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| React Router pages | Standard SPA routing: /canvas, /projects, /settings | |
| Zustand state-driven | No router, currentView field in store | |
| Hybrid — routes + modals | Main views use routes, secondary use modals | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Top toolbar + left panel | Classic creative tool layout (Figma/Photoshop style) | |
| Top toolbar + bottom panel | Excalidraw-native layout, more vertical space | |
| Minimal top bar + contextual tools | Minimal global bar, tools appear contextually | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current: left LayerPanel + right PropertyPanel | Current split layout | |
| Left unified panel + tab switching | Single left panel with tabs: Layers \| Assets \| Properties | ✓ |
| Left LayerPanel + right PropertyPanel + bottom AssetPanel | Three-zone layout | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed width (288px) | Simple, always visible | |
| Resizable width | User-draggable border | |
| Fixed + collapsible | Fixed width, collapse to icons | ✓ |

**User's choice:** Hybrid navigation (React Router + modals), minimal top bar with contextual tools, left unified panel with tab switching, fixed-width + collapsible sidebar
**Notes:** User explicitly compared to Figma's approach. The focus mode concept (canvas/nodes) is extended into contextual tool visibility.

---

## Project Management & Export

| Option | Description | Selected |
|--------|-------------|----------|
| Grid cards | Visual cards with thumbnails | ✓ |
| List view | Table-like list | |
| Grid + list toggle | Switchable | |

| Option | Description | Selected |
|--------|-------------|----------|
| Blank canvas only | Direct creation | |
| Start page — blank + template selection | Figma-style start page | ✓ |
| Default blank + template entry button | Hybrid approach | |

| Option | Description | Selected |
|--------|-------------|----------|
| Dialog config export | Modal with all settings | |
| Quick one-click + advanced options | Default + dropdown for more | ✓ |
| Save As Image menu | Always configurable | |

**User's choice:** Grid cards with thumbnails, start page with blank + templates, quick one-click export (PNG) with advanced dropdown
**Notes:** projectService CRUD already exists — Phase 7 only needs UI. Quick export is 1x transparent PNG by default. No export preview — viewport serves as preview.

---

## Settings Page & Dark Mode

| Option | Description | Selected |
|--------|-------------|----------|
| AI config only | Just API keys and providers | |
| AI + theme | AI + light/dark toggle | |
| Full: AI + theme + export defaults + language | Comprehensive | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 7 implement | Complete dark mode in Phase 7 | |
| Store/preference only | Preference saved, CSS deferred | |
| Full + system preference | Light/dark/system with prefers-color-scheme | ✓ |

**User's choice:** Full settings page (AI config, theme, export defaults, language placeholder). Dark mode implemented fully in Phase 7 with light/dark/system support.

---

## Deferred Features & Keyboard Shortcuts

| Option | Description | Selected |
|--------|-------------|----------|
| Global execution progress panel | Queue visibility UI | ✓ |
| Execution log panel | Node execution history | ✓ |
| UI slider components | Replace numeric inputs with sliders | ✓ |
| Visual prompt template editor | In-app template editing | ✓ |

(All four selected — multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded shortcuts | useEffect keydown listeners | |
| Hook-based system | useKeyboardShortcuts hook | |
| System + discovery panel | Hook + ?-key shortcut panel | ✓ |

**User's choice:** All four deferred features included in Phase 7. Full keyboard shortcut management system with discovery panel (`?` key).
**Notes:** The user chose to include all accumulated deferred features rather than deferring further. This expands Phase 7 scope beyond the original UI-01~UI-04 requirements.

---

## Claude's Discretion

Areas where user deferred to Claude's judgment:
- React Router route structure details
- Specific keyboard shortcut bindings
- Tab panel implementation (shadcn/ui vs custom)
- Collapsible sidebar animation
- Progress panel visual design
- Slider styling details
- Prompt editor specific layout
- Dark mode CSS variable definitions
- Export implementation (OffscreenCanvas vs canvas.toBlob)
- Error handling specifics (delete confirmation, undo toast)
