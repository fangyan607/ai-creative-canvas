# Phase 2: Node Editor Interface — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 02-node-editor-interface
**Areas discussed:** Layout, Node Style, Parameter Panel, Connection Validation, Canvas Integration, Templates
**Modes:** Interactive discussion (user selected all 6 areas)

---

## Area 1: Node Editor Layout

| Option | Description | Selected |
|--------|-------------|----------|
| A) Overlay | React Flow transparent overlay on Excalidraw, shared viewport | ✓ |
| B) Side-by-side | Canvas left, node editor right, split screen | |
| C) Tab switching | Canvas and node editor as different views/tabs | |

**User's choice:** A) Overlay
**Notes:** Nodes float on the canvas surface. React Flow viewport synced with Excalidraw viewport. Coordinate transformation functions need implementation.

---

## Area 2: Node Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| A) Hand-drawn aesthetic | Nodes in sketchy style matching Excalidraw | |
| B) Clean modern | Professional, clean design contrasting with canvas | |
| C) Hybrid | Clean node internals with warm/hand-drawn palette | ✓ |

**User's choice:** C) Hybrid
**Notes:** "Clean but friendly" — not purely skeuomorphic, not purely cold modern.

---

## Area 3: Parameter Panel

| Option | Description | Selected |
|--------|-------------|----------|
| A) Right-side panel | New PropertyPanel on right side, LayerPanel stays left | ✓ |
| B) Replace LayerPanel | Left panel toggles between layers and parameters | |
| C) Inline + side panel | Simple params in node, complex in side panel | |

**User's choice:** A) Right-side panel
**Notes:** Fixed w-72 (288px). Uses fine-grained selectors on NodeGraphStore.

---

## Area 4: Connection Validation

| Option | Description | Selected |
|--------|-------------|----------|
| A) Loose validation | Single unified socket type with 4-step pipeline | ✓ |
| B) Strict type system | Text/image/style socket types with color coding | |

**User's choice:** A) Loose validation
**Notes:** Self-connection banned, duplicates banned, direction enforced, DAG acyclicity enforced.

---

## Area 5: Canvas Integration

| Option | Description | Selected |
|--------|-------------|----------|
| A) Transparent overlay | React Flow overlay sharing Excalidraw viewport | ✓ |
| B) Fixed panel | Node editor in a fixed screen area with independent zoom | |
| C) Mode switching | Toggle between canvas mode and node editor mode | |
| D) Snap-to-canvas | Separate views with a "snap" operation | |

**User's choice:** A) Transparent overlay
**Notes:** Focus mode toggle (Canvas mode / Node mode) controls which layer is interactive.

---

## Area 6: Quick-Start Templates

| Option | Description | Selected |
|--------|-------------|----------|
| A) 2 built-in templates | Text-to-Image + Style Transfer | ✓ |
| B) 3-4 templates | More variety but more maintenance | |
| C) 1 template | Minimal, single text-to-image workflow | |

**User's choice:** A) 2 built-in templates
**Notes:** Templates as static JSON in TypeScript constants file.

---

## Claude's Discretion

- Socket colors and labels: Follow React Flow conventions (input left/output right, small circles)
- Template dialog UI: Simple card-based dialog with name + description
- Mode toggle: Ctrl+Shift+N shortcut

## Deferred Ideas

- Slider components for numeric parameters → Phase 7
- User-customizable templates → v0.2+
- Node sub-groups → Phase 3
- Responsive/mobile layout → v1.0
