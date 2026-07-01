# Technology Stack

**Project:** AI创意画布 (AI Creative Canvas)
**Researched:** 2026-06-29
**Overall confidence:** HIGH (primary sources verified)

---

## Executive Summary

The planned stack from the project architecture document (dated 2026-06-29) was well-researched but several versions are already outdated. As of mid-2026, the following major version bumps are critical:

- **React 18 -> 19**: React 18 is in security-only mode. React 19.2.7 is current.
- **Zustand 4 -> 5**: v5 has breaking changes. v5.0.12 is current.
- **TailwindCSS 3 -> 4**: v4 is a complete rewrite (Oxide engine, CSS-first config).
- **Vite 5 -> 8**: Rolldown-based Vite 8 delivers 10-30x faster builds.
- **Node.js 20 LTS -> 24 LTS**: Node 20 reached EOL April 30, 2026.
- **Zod 3 -> 4**: v4 is 14x faster string parsing, ~57% smaller bundle.
- **pnpm 9 -> 11**: v11 adds supply-chain security defaults, requires Node 22+.

The strategic choices (Excalidraw fork, React Flow, Hono, Drizzle ORM, Zustand+Immer, shadcn/ui) remain correct for mid-2026. No alternative has emerged that better fits this project's MIT-licensed, hand-drawn aesthetic, canvas-performance-optimized requirements.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TypeScript | 5.x | Language | Type safety across full stack. Still current in 2026. No v6 on horizon. |
| React | 19.2.7 | UI framework | React 18 is security-only. React 19 brings stable Compiler (auto-memoization), Actions model (pending states, optimistic updates). Excalidraw v0.18+ and React Flow 12.x both support React 19 natively. |
| Vite | 8.0.x | Build tool | Rolldown-based Vite 8 delivers 10-30x faster production builds, dev/prod parity, unified Rust toolchain. Greenfield project should start here — avoids future migration from Vite 6. Requires Node 22+. |
| pnpm | 11.8.0 | Package manager | v11 adds supply-chain security defaults (min release age, blockExoticSubdeps), SBOM generation, native publish. Store v11 is SQLite-based. Requires Node 22+. |

### Canvas & Node Editor

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Excalidraw (fork) | v0.18.x base | Infinite canvas | MIT license (no commercial restrictions). Canvas-based rendering handles thousands of elements better than DOM-based (tldraw). Hand-drawn aesthetic is product identity. tldraw ($6K/yr commercial license) was evaluated and rejected for cost and licensing reasons. |
| @xyflow/react | 12.11.1 | Node editor | Most mature React node editor (374+ releases). v12 supports React 19, dark mode, SSR. Still the right choice — no viable alternative has emerged. |

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | 5.0.12 | State management | v5 is a breaking change from v4 (dropped create() from default export, middleware path changes). Fully compatible with Immer middleware since v5.0.11 (slice typing fix). ~3-4KB gzipped vs Redux Toolkit's ~17-19KB. |
| Immer | 11.1.8 | Immutable state | Works with Zustand v5 middleware. v11 is stable with no known vulnerabilities. |

### UI & Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TailwindCSS | 4.3.1 | Utility CSS | v4 is a complete rewrite (Oxide Rust engine, CSS-first config, auto content detection, built-in @container queries). 10x faster builds. BREAKING CHANGE from v3: no tailwind.config.js, configure via @theme in CSS. |
| Radix UI | latest | Headless primitives | Still the standard in 2026. Supports React 19. shadcn/ui is built on top. |
| shadcn/ui | CLI v4.0.5 | Component collection | De facto standard in 2026 (~109K stars, ~1.87M weekly npm downloads). Zero runtime deps, total customization via local source code. 76 components. |
| Lucide React | 1.21.0 | Icons | v1.x stable since March 2026. Tree-shakable, lightweight. |

### HTTP & Storage (Browser)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ky | 2.0.2 | HTTP client | v2 adds unified hooks, built-in Zod schema validation via Standard Schema spec, smarter timeouts. Requires Node 22+. Zero-dependency fetch wrapper. |
| Dexie.js | 4.4.2 | IndexedDB | v4.4 adds blob offloading, IndexedDB 3.0 optimizations, micro-kernel architecture. ~2.6M monthly downloads. |

### Backend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 24 LTS | Runtime | Node 20 reached EOL April 30, 2026. Node 24 (Krypton) is Active LTS until April 2028. Node 26 is Current (LTS in October 2026). Recommend Node 24 LTS for stability. |
| Hono | 4.12.x | Web framework | Still v4.x in mid-2026 (4.12.16 latest). Multi-runtime (Node/Workers/Bun/Deno). ~28,600 req/sec on Node 22. Lightweight (~14-20KB). |
| Drizzle ORM | 0.45.2 | ORM | Approaching v1.0.0 (RC candidates exist). Zero-runtime, TypeScript-first. v0.45.2 fixes critical SQL injection in sql.identifier() escaping. |
| better-sqlite3 | 12.10.0 | SQLite driver | Synchronous, fast. Still actively maintained. Node 22/24 compatible. |

### Cloud Services (Future)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cloudflare D1 | GA | Serverless SQLite | Production-ready. Global read replication, Time Travel recovery, 1TB per DB. Compatible with Drizzle ORM (same SQLite dialect). |
| Cloudflare R2 | GA | Object storage | S3-compatible, zero egress fees. For file uploads/media storage. |
| Cloudflare Workers | GA | Edge runtime | Hono's primary deployment target. D1 + R2 + Workers = full serverless backend. |

### Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zod | 4.4.3 | Runtime validation | v4 is a major rewrite: 14x faster string parsing, 57% smaller bundle (~13KB gzipped), JSON Schema generation (z.toJSONSchema()), codecs for bidirectional transforms, async refinements. BREAKING from v3: unified error parameter, deprecated string format methods. |

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @hono/jwt | latest | JWT auth | Built-in Hono middleware for JWT. Lightweight, no external dependencies. MVP can skip auth entirely (trusted client). |

### Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | 4.1.x | Unit/integration | v4 adds test tagging (like pytest markers), AI agent reporter, experimental native Node.js execution. Compatible with Vite 8. |
| Playwright | 1.61.1 | E2E testing | Latest stable. Cross-browser testing. 1.55+ dropped Chromium manifest v2 support. |

---

## Modified Stack vs. Original Plan

| Layer | Original (Plan) | Updated (2026) | Breaking? | Migration Notes |
|-------|-----------------|----------------|-----------|-----------------|
| **React** | 18.x | 19.2.7 | Minor | React 18->19: `children` as prop instead of JSX intrinsic, ref callback changes, removed `forwardRef` (optional). Excalidraw v0.18+ and React Flow 12.x fully compatible. |
| **Vite** | 5.x | 8.0.x | Major | `build.rollupOptions` -> `build.rolldownOptions`; Babel removed (Oxc replaces), requires Node 22+. Greenfield starts clean. |
| **Zustand** | 4.x | 5.0.12 | Breaking | `create()` not exported from main — use `import { create } from 'zustand'`. Middleware import paths changed. Immer from `zustand/middleware/immer`. |
| **Immer** | 10.x | 11.1.8 | Minor | Compatible API. Zustand v5 + Immer works fully (slice typing fixed in v5.0.11). |
| **TailwindCSS** | 3.x | 4.3.1 | Major | No `tailwind.config.js`. CSS-first config via `@theme`. Requires migration of all config. Auto content detection removes purge config. |
| **Zod** | 3.x | 4.4.3 | Breaking | Unified error API, deprecated string format methods, Z ISO format changes. Rewrite schema validation calls. |
| **Node.js** | 20 LTS | 24 LTS | Moderate | Node 20 is EOL (April 30, 2026). Node 22 is Maintenance LTS. Node 24 is Active LTS. This project starts fresh — pick 24. |
| **pnpm** | 9.x | 11.8.0 | Breaking | v11 requires Node 22+. v10 supported Node 18+. Supply-chain security defaults may block npm packages <24h old during development. |
| **Ky** | 1.x | 2.0.2 | Breaking | Unified hooks API, `prefixUrl` -> `prefix`, new `baseUrl` option. Requires Node 22. |
| **Lucide** | latest | 1.21.0 | Minor | v1.0 was a stable milestone in March 2026. No API changes for basic usage. |
| **Dexie.js** | 3.x | 4.4.2 | Minor | v4 adds blob offloading and IDB 3.0 support. Core CRUD API unchanged. |
| **Vitest** | latest | 4.1.x | Minor | v4 compatible with Vite 8. Retro-compatible test runner API. |
| **Playwright** | latest | 1.61.1 | None | Latest stable, no breaking changes for typical usage. |

### Unchanged Choices (Verified Correct)

These items from the original plan remain the right call:

| Item | Decision | Confidence | Reason |
|------|----------|------------|--------|
| TypeScript 5.x | Keep | HIGH | Still current. No v6 announced. |
| Excalidraw (Fork) | Keep | HIGH | MIT license, canvas-based performance, hand-drawn aesthetic. tldraw evaluated: $6K/yr commercial license is prohibitive for single-developer project. tldraw's AI features compelling but not worth licensing cost + DOM rendering tradeoff. |
| @xyflow/react 12.x | Keep | HIGH | v12 is still current (12.11.1). Actively maintained. No v13 announced. |
| Hono 4.x | Keep | HIGH | Still v4.x in mid-2026. Multi-runtime, fast, lightweight. |
| Drizzle ORM | Keep | HIGH | Approaching v1.0. Best TypeScript-native ORM for SQLite/D1. |
| better-sqlite3 | Keep | HIGH | Still the standard synchronous SQLite driver for Node.js. |
| shadcn/ui + Radix | Keep | HIGH | De facto standard in 2026. No viable alternative with same DX. |
| Zustand + Immer | Keep | HIGH | Just bump to v5. Still best-in-class for this use case. Redux Toolkit has more boilerplate, Jotai less suitable for complex cross-store synchronization (canvas + node graph + AI queue). |
| Ky | Keep | MEDIUM | Could use native fetch (available in Node 22+). Ky adds schema validation, better error handling, retries. Worth keeping. |
| Dexie.js | Keep | HIGH | No viable alternative for browser-side structured storage. |

---

## Alternatives Considered

| Category | Recommended | Alternative(s) | Why Not |
|----------|-------------|----------------|---------|
| Canvas renderer | Excalidraw (fork, MIT) | tldraw (source-available) | tldraw requires ~$6K/yr commercial license. DOM-based rendering worse for 10K+ elements. Not suitable for single-developer MIT project. |
| Node editor | @xyflow/react 12.x | Custom DAG renderer | 3-4 weeks to build what React Flow gives for free. |
| Web framework | Hono 4.x | Fastify, Express 5, Elysia | Fastify is faster on Node (31K vs 28K req/s) but not portable to Workers. Express 5 is 2.3x slower. Elysia requires Bun. Hono's multi-runtime portability is decisive for this project (Workers deployment option). |
| ORM | Drizzle ORM 0.45.x | Prisma 6, Kysely | Prisma is heavier (generated client, schema file), slower startup. Drizzle is TypeScript-native, zero-runtime, SQLite/D1 compatible without adapter gymnastics. |
| State management | Zustand 5 + Immer | Redux Toolkit, Jotai, Valtio | RTK 2x bundle size, more ceremony. Jotai less suitable for complex cross-store synchronization (canvas + node graph + AI queue need shared state). |
| Runtime validation | Zod 4 | Valibot, ArkType | Valibot is modular (smaller bundles), ArkType has higher TS inference. But Zod has largest ecosystem (react-hook-form, tRPC, Drizzle integration). Valibot worth evaluating for bundle-sensitive paths. |
| Package manager | pnpm 11 | Bun, npm 11 | Bun not stable enough for production. npm 11 doesn't have strict dependency isolation. pnpm 11 is current standard. |
| IndexedDB | Dexie.js 4.x | idb-keyval, localForage | Dexie provides query, indexing, transactions — needed for this project's structured data. idb-keyval is key-value only. |
| Testing | Vitest 4 + Playwright | Jest 30, Cypress | Jest is slower, less Vite-native. Playwright is faster and more reliable than Cypress for E2E. |

---

## Installation

```bash
# Node.js v24 LTS required
# pnpm v11 required (install: npm install -g pnpm@latest)

# Core
pnpm add react@^19 react-dom@^19 @xyflow/react@^12 zustand@^5 immer@^11
pnpm add @hono/hono@^4 drizzle-orm@^0.45 better-sqlite3@^12
pnpm add zod@^4 ky@^2 dexie@^4

# UI
pnpm add tailwindcss@^4 @tailwindcss/cli lucide-react@^1
pnpm add @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-slider @radix-ui/react-tooltip
pnpm add @radix-ui/react-dropdown-menu @radix-ui/react-popover
pnpm add @radix-ui/react-tabs @radix-ui/react-toast

# Dev dependencies
pnpm add -D typescript@^5 @types/react @types/react-dom
pnpm add -D vite@^8 @vitejs/plugin-react@^6
pnpm add -D vitest@^4 @playwright/test@^1
pnpm add -D drizzle-kit@^0.30
```

### Vite 8 Required Config Changes

```typescript
// vite.config.ts — Vite 8 uses Rolldown, not Rollup
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Vite 8: Rolldown options, NOT rollupOptions
    rolldownOptions: {
      // was: rollupOptions.output.manualChunks
    }
  }
})
```

### TailwindCSS v4 Config Migration

```css
/* app.css — Tailwind v4 uses CSS-first config, no tailwind.config.js */
@import "tailwindcss";

@theme {
  --color-primary: #6c5ce7;
  --color-secondary: #00cec9;
  --font-sans: 'Inter', sans-serif;
}
```

### Zustand v5 Migration

```typescript
// Zustand v5: import create from main entry
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// v5: middleware path changed from 'zustand/middleware' to 'zustand/middleware/immer'
const useStore = create<EditorStore>()(
  immer((set) => ({
    // ...
  }))
)
```

### pnpm v11 Config

```yaml
# .npmrc — v11 supply-chain security
pnpm-minimum-release-age=1440    # 24h minimum age (dev: set to 0)
pnpm-allow-build=esbuild         # explicit build script approval
verify-deps-before-run=install   # verify lockfile before scripts
```

---

## Node.js Version Decision

| Version | Status | EOL | Verdict |
|---------|--------|-----|---------|
| Node 20 "Iron" | **EOL** | April 30, 2026 | DO NOT USE — already expired |
| Node 22 "Jod" | Maintenance LTS | April 30, 2027 | Viable but already in maintenance |
| **Node 24 "Krypton"** | **Active LTS** | **April 30, 2028** | **RECOMMENDED** |
| Node 26 | Current (LTS Oct 2026) | April 30, 2029 | Too new, ecosystem may lag |

**Recommendation: Node.js 24 LTS.** Vite 8 requires Node 20.19+/22.12+. pnpm 11 requires Node 22+. Node 24 gives the longest runway (EOL April 2028) while being stable enough that all libraries support it.

---

## Vite 8 vs Vite 6 Decision

Vite 8 (released March 12, 2026, Rolldown 1.0 on May 7, 2026) is the current Vite line. However, consider:

| Factor | Vite 6 (Conservative) | Vite 8 (Recommended) |
|--------|----------------------|---------------------|
| **Bundler** | esbuild (dev) + Rollup (prod) | Rolldown (single Rust bundler) |
| **Speed** | Fast | 10-30x faster production builds |
| **Dev/Prod Parity** | Common bugs | Eliminated (single bundler) |
| **React Transform** | Babel | Oxc (40x faster) |
| **Breaking Changes** | None (well-known) | `build.rolldownOptions`, drops Node 18, drops old browsers |
| **Runtime** | Node 18+ | Node 20.19+ / 22.12+ |
| **Stability** | Battle-tested | 3+ months stable, large projects migrated (Linear, Supabase) |

**Verdict: Use Vite 8.** Greenfield project avoids migration pain. The performance gains are significant. All critical libraries (Vitest 4, @vitejs/plugin-react 6, React Flow, shadcn/ui) support it.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Core stack (React/Vite/Zustand) | HIGH | All verified via official docs + npm registry data |
| Canvas choice (Excalidraw fork) | HIGH | MIT license requirement makes this decisive |
| Node editor (React Flow) | HIGH | No viable alternatives, actively maintained |
| Backend (Hono/Drizzle/SQLite) | HIGH | Verified against official docs |
| UI (shadcn/ui + Tailwind v4) | HIGH | De facto standard in 2026 |
| Testing (Vitest + Playwright) | HIGH | Industry standard in 2026 |
| Cloud services (CF D1/R2) | MEDIUM | D1 is production-ready but project may not deploy to CF |

## Sources

- React 19: https://versionlog.com/react | https://releaserun.com/versions/react/19/
- Vite 8: https://vite.dev/blog/announcing-vite8 | https://voidzero.dev/posts/announcing-rolldown-1-0
- @xyflow/react 12: https://www.npmjs.com/package/@xyflow/react | https://xyflow.com/blog
- Zustand 5: https://github.com/pmndrs/zustand/releases
- TailwindCSS 4: https://tailwindcss.com/blog/tailwindcss-v4-3
- Hono 4: https://hono.dev/docs | https://github.com/honojs/hono
- Drizzle ORM: https://github.com/drizzle-team/drizzle-orm/releases
- Node.js releases: https://github.com/nodejs/Release
- pnpm 11: https://pnpm.io/next/cli/update
- Zod 4: https://www.npmjs.com/package/zod
- Ky 2: https://github.com/sindresorhus/ky | https://www.infoq.com/news/2026/06/ky-2-revamp-axios/
- Dexie 4: https://dexie.org/blog/dexie-44-dexie-cloud-server-30-the-big-one
- Lucide 1.x: https://github.com/lucide-icons/lucide/releases
- Excalidraw React 19: https://github.com/excalidraw/excalidraw/pull/9182
- Cloudflare D1: https://cloudflare-docs.cloudflare-docs.workers.dev/d1/
- Vitest 4: https://vitest.dev/blog/vitest-4-1.html
- Playwright 1.61: https://www.versioneye.com/NodeJS/playwright/1.61.1
- shadcn/ui 2026: https://blocks.serp.co/blog/state-of-shadcn-ui-2026
- tldraw vs Excalidraw: https://www.libhunt.com/compare-tldraw-vs-excalidraw
