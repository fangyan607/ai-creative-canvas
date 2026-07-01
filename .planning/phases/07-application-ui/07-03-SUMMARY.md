---
phase: 07-application-ui
plan: 03
type: execute
wave: 3
created: 2026-07-01T12:20:52Z
duration: 20min
requirements: [UI-04]
tags: [settings-page, prompt-editor, keyboard-shortcuts, theme, ai-provider-config, export-defaults]
dependency:
  requires: [07-01, 07-02]
  provides: [phase-completion]
  affects: [settings-page, canvas-page, top-bar, indexedb-schema]
tech-stack:
  added:
    - "@testing-library/user-event (dev)"
  patterns:
    - "shortcutRegistry static array for shortcut discovery via ShortcutPanel"
    - "SettingsPage with useUIPreferencesStore for theme/export, ProviderStore for AI config"
    - "Inline renderPreview for template rendering (avoids ai-core TS resolution issue)"
key-files:
  created:
    - apps/web/src/pages/SettingsPage.tsx (284 lines, full settings page)
    - apps/web/src/components/PromptEditor.tsx (198 lines, visual template editor)
    - apps/web/src/components/ShortcutPanel.tsx (148 lines, keyboard shortcut discovery)
    - apps/web/src/components/ui/label.tsx (27 lines, shadcn label component)
    - apps/web/src/__tests__/pages/SettingsPage.test.tsx (173 lines, 11 tests)
    - apps/web/src/__tests__/components/PromptEditor.test.tsx (104 lines, 8 tests)
    - apps/web/src/__tests__/components/ShortcutPanel.test.tsx (119 lines, 7 tests)
  modified:
    - apps/web/src/hooks/useKeyboardShortcuts.ts (extended with shortcutRegistry)
    - apps/web/src/pages/CanvasPage.tsx (wired ShortcutPanel, useKeyboardShortcuts)
    - apps/web/src/indexedb/db.ts (version 3 with promptTemplates table)
    - apps/web/src/components/ExportDialog.tsx (fixed SelectPopup -> SelectContent, type fixes)
    - apps/web/src/__tests__/components/AppShell.test.tsx (added providerStoreSingleton mock)
decisions:
  - "PromptEditor uses inline renderPreview instead of @ac-canvas/ai-core/prompt/templateEngine to avoid subpath import that causes TS module resolution errors (pre-existing issue)"
  - "SettingsPage calls initProviderStore() on mount (self-initializing) to handle direct navigation to /settings without CanvasPage bootstrap"
  - "useKeyboardShortcuts extends with shortcutRegistry static array for ShortcutPanel discovery; shortcuts register on mount and deregister on unmount"
metrics:
  tasks: 3
  files_created: 8
  files_modified: 5
---

# Phase 7 Plan 03 Summary: Settings Page, Prompt Editor, Shortcut Panel

Built the complete settings page (UI-04), visual prompt template editor, and keyboard shortcut discovery panel. Wired the centralized keyboard shortcut system into CanvasPage and added IndexedDB schema v3 for prompt templates.

## Key Decisions

| Decision | Value |
|----------|-------|
| **SettingsPage initialization** | Calls `initProviderStore()` on mount to handle direct navigation to `/settings` without going through CanvasPage. |
| **PromptEditor rendering** | Uses `renderPreview()` inline function instead of `@ac-canvas/ai-core/prompt/templateEngine` to avoid TypeScript subpath import resolution issues (pre-existing). Handlebars-compatible `{{variable}}` syntax preserved. |
| **Shortcut discovery** | `shortcutRegistry` static array exported from `useKeyboardShortcuts.ts`, populated on mount and cleaned up on unmount. ShortcutPanel reads directly from this array. |
| **Export defaults select** | Fixed `SelectPopup` -> `SelectContent` throughout and `onValueChange` type from `(value: string) => void` to `(value: string \| null) => void` (matching @base-ui/react Select API). |
| **Theme section UX** | Three-button group (not Select) for light/dark/system with active state styling, matching common pattern. Writes to `useUIPreferencesStore` which persists to localStorage. |

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | `c418ace` | feat(07-03): create full SettingsPage with AI Provider config, Theme, Export defaults, Language sections |
| 2 | `bac0164` | feat(07-03): create PromptEditor with live preview and IndexedDB persistence |
| 3 | `3952bc9` | feat(07-03): create ShortcutPanel and wire keyboard shortcuts into CanvasPage |
| Fix | `346272a` | fix(07-03): type and syntax fixes in SettingsPage, ExportDialog, PromptEditor |

## Progress

- **Tasks:** 3/3 completed
- **Tests:** 154/160 passing (6 pre-existing ProjectsPage failures -- stub not replaced in this worktree)
- **Files created:** 8 (SettingsPage, PromptEditor, ShortcutPanel, label UI component, 3 test files, updated db schema)
- **Files modified:** 5 (useKeyboardShortcuts, CanvasPage, db.ts, ExportDialog, AppShell test)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing @testing-library/user-event dependency**
- **Found during:** Task 1 test execution
- **Issue:** ProjectsPage tests already required it, and SettingsPage tests also needed it for user interactions
- **Fix:** Installed `@testing-library/user-event@^14.6.1` as dev dependency
- **Files modified:** `apps/web/package.json`

**2. [Rule 1 - Bug] ExportDialog uses SelectPopup instead of SelectContent**
- **Found during:** Test execution
- **Issue:** `SelectPopup` was not a valid export from select.tsx; the correct name is `SelectContent`. This caused "Element type is invalid" runtime error in ExportDialog tests.
- **Fix:** Replaced all `SelectPopup` with `SelectContent` in ExportDialog.tsx
- **Files modified:** `apps/web/src/components/ExportDialog.tsx`

**3. [Rule 1 - Bug] ExportDialog onValueChange type mismatch with base-ui/react Select**
- **Found during:** TypeScript compilation
- **Issue:** @base-ui/react Select's `onValueChange` passes `(value: string | null, ...)` not `(value: string)` as typed. This applied to both ExportDialog and SettingsPage.
- **Fix:** Changed all `onValueChange` callbacks to accept `string | null` with guard clauses
- **Files modified:** `apps/web/src/components/ExportDialog.tsx`, `apps/web/src/pages/SettingsPage.tsx`

**4. [Rule 3 - Blocking] TypeScript module resolution for @ac-canvas/ai-core/prompt/templateEngine**
- **Found during:** TypeScript compilation
- **Issue:** The deep import `@ac-canvas/ai-core/prompt/templateEngine` fails TS module resolution (pre-existing known issue)
- **Fix:** Inlined `renderPreview` function in PromptEditor component instead of importing from ai-core. Handlebars-compatible `{{variable}}` syntax is preserved.
- **Files modified:** `apps/web/src/components/PromptEditor.tsx`

### Pre-existing Issues (Out of Scope)
- 6 ProjectsPage.test.tsx failures -- ProjectsPage is still the Plan 01 stub (not replaced in this worktree base). The full implementation exists in commit 72cc8af but is not visible from the base HEAD.
- TypeScript compilation errors in excalidraw fork remain (same as Plan 01/02)
- Type errors in aiBridge and aiQueueStore tests remain (same as Plan 01/02)

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information_disclosure | `apps/web/src/pages/SettingsPage.tsx` | API Key input fields store plaintext transiently while user types. Values encrypted by ProviderStore before IndexedDB write. Show/hide toggle exposes key visually but only during active input. Consistent with T-07-08 mitigated disposition. |

No new security-relevant surface beyond plan's threat model. Theme localStorage and prompt templates in IndexedDB have `accept` disposition per threat register.

## Stub Tracking

| File | Stub | Reason |
|------|------|--------|
| `apps/web/src/pages/SettingsPage.tsx` (Language section) | "中文（简体）" displayed, "更多语言即将推出" note | D-10 explicitly says Language is placeholder UI for future expansion. Not a gap. |
| `apps/web/src/pages/SettingsPage.tsx` (Test Connection) | Placeholder toast "连接测试（功能开发中）" | Actual connection test requires Phase 4/5 adapter infrastructure. |
| `apps/web/src/components/PromptEditor.tsx` (templateId prop) | Passed but unused | Future extension point for editing existing templates. MVP opens empty editor only. |

## Self-Check: PASSED

- [x] All 3 tasks committed with proper feat/fix prefixes
- [x] `apps/web/src/pages/SettingsPage.tsx` exists with 4 sections (AI Provider, Theme, Export, Language) at 284 lines (min 120)
- [x] SettingsPage uses `getProviderStore()` for provider config CRUD
- [x] SettingsPage uses `useUIPreferencesStore` for theme and export defaults
- [x] Theme switching toggles `.dark` class on `document.documentElement`
- [x] SettingsPage has "保存设置" button
- [x] Language placeholder shows "中文（简体）" with "更多语言即将推出"
- [x] SettingsPage accessible at `/settings` route
- [x] TopBar view switcher highlights active route via `useLocation()`
- [x] `apps/web/src/__tests__/pages/SettingsPage.test.tsx` exists (11 tests passing)
- [x] `apps/web/src/components/PromptEditor.tsx` exists (198 lines, min 80)
- [x] PromptEditor shows template text area, variable parsing, live preview, save button
- [x] `apps/web/src/indexedb/db.ts` has version 3 schema with `promptTemplates` table
- [x] `apps/web/src/__tests__/components/PromptEditor.test.tsx` exists (8 tests passing)
- [x] `apps/web/src/components/ShortcutPanel.tsx` exists (148 lines, min 60)
- [x] `apps/web/src/hooks/useKeyboardShortcuts.ts` exports `shortcutRegistry` array
- [x] ShortcutPanel shows searchable list of shortcuts grouped by category
- [x] CanvasPage wires ShortcutPanel, registers shortcuts (?, Ctrl+S, Ctrl+Enter, Escape)
- [x] Old ad-hoc Ctrl+Enter keydown listener removed from CanvasPage
- [x] `apps/web/src/__tests__/components/ShortcutPanel.test.tsx` exists (7 tests passing)
- [x] Dark mode anti-flash script present in index.html (grep hit found)
