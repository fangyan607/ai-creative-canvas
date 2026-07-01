---
phase: 7
slug: application-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x |
| **Config file** | Inline in `vite.config.ts` (test section) |
| **Quick run command** | `npx vitest run --reporter=verbose -t "test name"` |
| **Full suite command** | `npx vitest run --reporter=verbose --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose -t "test name"`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | UI-01 | N/A | Top bar renders, sidebar toggles | component | `npx vitest run -t "app shell"` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | UI-01 | N/A | Tab switching works (Layers/Assets/Properties) | component | `npx vitest run -t "sidebar tabs"` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | UI-02 | N/A | Export produces downloadable Blob | integration | `npx vitest run -t "export"` | ❌ W0 | ⬜ pending |
| 07-03-01 | 02 | 1 | UI-03 | N/A | Project list loads from IndexedDB | integration | `npx vitest run -t "project list"` | ❌ W0 | ⬜ pending |
| 07-03-02 | 02 | 1 | UI-03 | N/A | Create project via UI | integration | `npx vitest run -t "create project"` | ❌ W0 | ⬜ pending |
| 07-03-03 | 02 | 1 | UI-03 | N/A | Delete project with confirmation | integration | `npx vitest run -t "delete project"` | ❌ W0 | ⬜ pending |
| 07-04-01 | 03 | 2 | UI-04 | T-01 | Settings renders all sections, API key masked | component | `npx vitest run -t "settings"` | ❌ W0 | ⬜ pending |
| 07-04-02 | 03 | 2 | UI-04 | N/A | Dark mode toggle persists preference | integration | `npx vitest run -t "dark mode"` | ❌ W0 | ⬜ pending |
| D-15 | 03 | 2 | UI-01 | N/A | Slider replaces numeric inputs | component | `npx vitest run -t "slider"` | ❌ W0 | ⬜ pending |
| D-17 | 02 | 1 | UI-01 | N/A | Keyboard shortcuts register/unregister | unit | `npx vitest run -t "shortcuts"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/src/__tests__/components/AppShell.test.tsx` — stubs for UI-01
- [ ] `apps/web/src/__tests__/components/ExportDialog.test.tsx` — stubs for UI-02
- [ ] `apps/web/src/__tests__/pages/ProjectsPage.test.tsx` — stubs for UI-03
- [ ] `apps/web/src/__tests__/pages/SettingsPage.test.tsx` — stubs for UI-04
- [ ] `apps/web/src/__tests__/hooks/useKeyboardShortcuts.test.ts` — stubs for D-17
- [ ] `apps/web/src/__tests__/stores/uiPreferencesStore.test.ts` — stubs for D-11 store persistence

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Export visual fidelity (1:1 pixel match) | UI-02 | Rendering differences require human visual judgment | Export canvas as PNG 1x, open in image viewer, verify elements appear at expected positions and scale |
| Dark mode visual consistency | UI-04 | CSS variable correctness across 20+ components requires visual scan | Toggle dark mode, scan all views (canvas, projects, settings) for unreadable text, missing backgrounds, broken contrast |
| Keyboard shortcut collision-free | D-17 | Interaction with Excalidraw built-in handlers is runtime-dependent | Open canvas, press Ctrl+Z (should undo), press ? (should open shortcuts), press Delete with element selected (should delete) — all without errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
