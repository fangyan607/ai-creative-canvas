# Research Summary: AI Creative Canvas

**Project:** AI幹吭鮫下 (AI Creative Canvas)
**Synthesized:** 2026-06-29
**Status:** Research complete ！ all four domains (Stack, Features, Architecture, Pitfalls) analyzed

---

## Executive Summary

The AI Creative Canvas occupies a unique and defensible position in the 2026 creative tools landscape: a browser-based infinite canvas fused with a visual node-based AI pipeline editor, targeting users who want ComfyUI-grade control without needing a GPU or self-hosted infrastructure. No existing competitor ！ ComfyUI, Midjourney, Canva, Leonardo, Krea, Figma Weave, or Runway ！ fully combines an Excalidraw-style infinite canvas, a full DAG node editor, and multi-model AI generation in a single lightweight web application. The market positioning statement distilled from competitive analysis is: "ComfyUI's node control with Canva's accessibility on Excalidraw's infinite canvas ！ without needing a GPU or a subscription."

The technology stack is well-chosen but requires several version bumps from the original plan. React 18 must be 19 (18 is in security-only mode), TailwindCSS 3 must be 4 (a complete rewrite with Oxide engine), Vite 5 must be 8 (Rolldown-based, 10-30x faster builds), Node.js 20 must be 24 (Node 20 reached EOL April 30, 2026), and Zod 3 must be 4 (14x faster string parsing, 57% smaller bundle). The strategic choices ！ Excalidraw fork (MIT license), @xyflow/react 12, Hono, Drizzle ORM, Zustand + Immer, shadcn/ui, Radix UI ！ remain correct for mid-2026. No alternative has emerged that better fits this project's requirements.

The architecture is validated against real-world 2025-2026 production patterns from Giselle, TapCanvas, Infinite Canvas, and others. The three-layer design (Canvas Layer, Node Editor, AI Core over Zustand stores) is sound with specific refinements: domain-split Zustand stores (not one monolithic store), incremental DAG execution with dirty-path marking, local-state-for-drag performance pattern, SSE streaming for AI progress (not polling), and a four-step connection validation pipeline. The most significant architectural risk is the Excalidraw fork: 64.4% of cherry-picks fail between structurally divergent forks. Regular upstream syncing (every 2-4 weeks) and isolating customizations behind clear interfaces are mandatory from day one. The top three project-threatening risks are fork drift, AI vendor lock-in (the adapter pattern must be the first AI code written), and single-developer scope creep (every "while I am here" addition delays MVP).

---

## Key Findings

### Stack

1. **Version bumps required for all major dependencies.** React 18 to 19.2.7, Vite 5 to 8.0.x, TailwindCSS 3 to 4.3.1, Zustand 4 to 5.0.12, Immer 10 to 11.1.8, Zod 3 to 4.4.3, Node.js 20 to 24 LTS, pnpm 9 to 11.8.0, Ky 1 to 2.0.2, Dexie.js 3 to 4.4.2, Lucide latest to 1.21.0, Vitest latest to 4.1.x. Most changes are breaking and must be accounted for in initial project setup.

2. **Strategic choices remain correct.** Excalidraw fork (MIT license decisive ！ tldraw rejected at $6K/yr), @xyflow/react 12 (no viable alternative), Hono 4.x (multi-runtime portability decisive), Drizzle ORM (approaching v1.0, best TypeScript-native ORM for SQLite/D1), Zustand + Immer (best-in-class for cross-store sync), shadcn/ui + Radix (de facto standard in 2026).

3. **Backend optional but well-defined.** MVP can run entirely client-side (IndexedDB for persistence, mock adapter for AI). Backend (Hono + Drizzle + better-sqlite3) enables AI proxy, project sync, and authentication. Cloudflare D1/R2/Workers provides a natural serverless progression path.

4. **Vite 8 decision is clear.** Greenfield project should start with Vite 8 (Rolldown-based, 10-30x faster production builds, dev/prod parity). No migration cost since nothing exists yet.

5. **Node.js 24 LTS is the recommended runtime.** Node 20 is EOL (April 2026), Node 22 is in maintenance mode, Node 24 is Active LTS until April 2028. Vite 8 requires Node 22+, pnpm 11 requires Node 22+.

### Features

1. **Core competitive advantage: node-based visual workflow on infinite canvas.** This is the project's primary differentiator. No competitor (Midjourney, Canva, Leonardo, Clipdrop, DALL-E) combines these two paradigms. ComfyUI has node workflows but requires a GPU. Krea has limited node support and no real infinite canvas.

2. **Table stakes are well-understood.** Text-to-image, inpainting, outpainting, image-to-image, background removal, upscaling, infinite pan/zoom canvas, drag-and-drop, undo/redo, project save/load, PNG/JPG export, AI provider API key configuration, generation progress indicator. All must ship in MVP for the product to feel complete.

3. **The "three-body linkage" is the unique differentiator.** Canvas elements serve as node inputs, AI output embeds directly onto the canvas, and users compose multi-element scenes spatially. No competitor achieves this closed loop between infinite canvas, node graph, and AI generation.

4. **Image-to-video is a major market gap.** Only Runway Gen-3 and Krea offer strong AI video + editing in one tool. Most competitors (Canva, Leonardo) do text-to-video but not image-to-video. This is a strong v0.2 target.

5. **Multi-model adapter architecture is critical for vendor independence.** Most competitors lock users into their own model. The adapter pattern (OpenAI, Stability, Replicate, Runway, Kling) is a structural advantage that must be built from day one.

6. **Anti-features are well-catalogued.** Self-trained AI models (millions in GPU cost), custom canvas rendering engine (fork Excalidraw instead), real-time multi-user collaboration (CRDT + OT complexity, defer to v1.0+), desktop app (defer to v0.3), mobile app (defer to v1.0+), blockchain/NFT (zero user demand), built-in payment system (start free with BYOK model).

7. **MVP scope is well-defined.** Tier 1 (must ship): Excalidraw canvas fork, basic node editor with 4-5 node types, linear node execution engine, AI integration with at least one real adapter, PNG/JPG export. Tier 2 (should ship): image-to-image node, merge node, AI request queue, project management UI, settings page. Tier 3 (defer to v0.2): video generation, video editing nodes, template system, asset library, Electron wrapper, cloud sync.

### Architecture

1. **Three-layer frontend architecture is validated.** Canvas Layer (Excalidraw fork), Node Editor (React Flow v12), and AI Core communicate through domain-split Zustand stores. This matches production patterns from Giselle, TapCanvas, and AutoGPT.

2. **Five domain-specific Zustand stores, not one monolith.** CanvasStore (elements, viewport), NodeGraphStore (nodes, edges, execution), AIQueueStore (queue, progress, results), HistoryStore (undo/redo snapshots), UIPreferencesStore (panels, theme). Every state update in one domain does not re-render components from other domains.

3. **Incremental DAG execution with dirty-path marking.** The NodeEngine topologically sorts only the affected subgraph, not the full graph. Node outputs are cached by input hash. For a 20-node graph where one parameter changed, this executes ~3-5 nodes instead of all 20. Critical for real-time preview responsiveness.

4. **Local-state-for-drag pattern.** During pointer interactions (drag, resize, draw), use local React state. Commit to Zustand only on release. Reduces re-renders by ~75% compared to global state during drag. History capture is paused during drag, merged on drop.

5. **SSE streaming for AI progress, not polling.** Hono's streamSSE helper provides real-time progress with four events: queued, processing, chunk, done. No polling overhead, no wasted HTTP requests.

6. **Adapter pattern for AI providers.** Both frontend (ai-core) and backend (AI Gateway) use the adapter pattern. The frontend has an abstract AIProvider interface; the backend routes to external APIs with API key injection. This enables multi-model routing from day one.

7. **Connection validation pipeline.** Four-step validation: no self-connections, no duplicates, type-compatible sockets, DAG acyclicity. Cycle prevention at the UI level prevents runtime errors in the NodeEngine.

8. **Blob-aware history with drag throttling.** 180ms merge window for debouncing rapid changes. Max 50 snapshots. Memory-efficient serialization filters transient React Flow properties (selected, dragging, measured).

9. **Key scalability decision: Node Engine stays client-side for MVP.** Zero server load from node editing. Browser already handles rendering. Revisit at v0.3+ when cloud templates and shared workflows are introduced.

### Pitfalls

1. **CRITICAL: Excalidraw Fork Drift.** 64.4% of cherry-picks fail between structurally divergent forks. 91.6% of failures caused by upstream refactorings. 66% of forks never pull from upstream. Prevention: base fork on a release tag (not develop), sync upstream every 2-4 weeks, isolate customizations behind clear interfaces, contribute generic fixes upstream, document every modification in FORK_CHANGES.md.

2. **CRITICAL: AI Vendor Lock-In and Model Deprecation.** Real example: OpenAI shut down gpt-image-1 in May 2026. 81% of executives worry about AI vendor dependency but only 6% could lose their primary vendor without disruption. Prevention: adapter pattern from day one (not a refactoring target), multi-model routing, isolate prompts from models with PromptBuilder, version-lock reference outputs, budget enforcement with hard caps.

3. **CRITICAL: Single-Developer Scope Creep.** AI makes scope creep worse ！ every addition looks manageable in isolation but cumulative cost is invisible. Prevention: one feature per phase shipped, "if I only ship ONE feature" question before each session, never merge AI-generated code you cannot explain, timebox explorations to 2 hours, use GSD quality gates, celebrate small wins for momentum.

4. **HIGH: Canvas Rendering Over-Customization.** Dual-canvas architecture (StaticCanvas + InteractiveCanvas) must remain sacred. Heavy AI images at full resolution destroy frame rate. Prevention: resolution-tiered rendering (rectangle at <50%, half-res at 50-100%, full at >100%), OffscreenCanvas for image decoding, chunk-based rendering from day one.

5. **HIGH: Node Engine Complexity Explosion ("Node Soup").** Graphs become unmanageable without sub-groups, type validation, and complexity hiding. Prevention: sub-graph support with graduated reveal, consistent type system with explicit type annotations on every port, annotation support (notes on nodes/connections), size warning at 30 nodes, hard limit at 100.

6. **HIGH: AI Request Queue Mismanagement.** Naive retry logic without jitter creates self-inflicted DDoS. Missing timeouts cause stuck generations. Prevention: three-dimensional timeouts (connection 5s, read 60-180s, write 10s), retry only on 429/5xx with exponential backoff + jitter, circuit breaker after 5 failures in 1 minute, total 90s deadline, per-user concurrency limits of 1-2.

7. **MODERATE: Zustand Re-render Cascade.** Fine-grained selectors with useShallow are mandatory. React Flow uncontrolled API for dragging (commit position only on drag stop). Async storage for persist middleware. Selective persistence with partialize.

8. **MODERATE: Undo/Redo State Corruption.** Single unified undo stack wrapping both canvas and node graph state. Filter transient properties. Pause during drag, snapshot on drop. Scope history to active project. Max 50 entries. Deep clone before storing.

9. **MODERATE: Browser Memory Limits from AI-Generated Media.** Store images as Blob (not base64 ！ saves 33% space). Tiered storage: thumbnail/preview/full-resolution. LRU cache with 200MB hard limit. Revoke object URLs in cleanup functions. Request persistent storage. Convert to WebP. Handle QuotaExceededError gracefully.

10. **MODERATE: AI Generation Cost Mismanagement.** MockAdapter must be the default in development. Hard budget cap ($20/month dev). Cost-per-generation tracking. Cache identical prompts client-side (40-60% cost reduction). Separate API keys for dev and prod.

11. **MINOR: Keyboard Shortcut Conflicts.** Route all keyboard events through a single KeyboardManager that checks document.activeElement. Document key bindings in the UI help panel.

12. **MINOR: Coordinate System Drift.** Excalidraw and React Flow use different zoom/pan transforms. Create shared transform utility. Test at 50%, 100%, 200%, 400% zoom with visual regression tests.

---

## Implications for Roadmap

### Recommended Phase Structure

#### Phase 1: Core Canvas (Estimated: 2-3 weeks)
**Excalidraw fork + basic canvas operations + IndexedDB persistence**

The Excalidraw fork is the foundation everything else is built on. Fork drift (Pitfall 1) must be addressed from day one ！ base on a release tag, establish the 2-4 week sync cadence, and create FORK_CHANGES.md. Performance baselines (Pitfall 2: resolution-tiered rendering, chunk-based culling) must be in place before AI elements are added in later phases. IndexedDB persistence enables a functional offline app from the start.

**Deliverable:** A working infinite canvas with pan/zoom, element selection/deletion, undo/redo, project save/load, and a documented fork management process.

#### Phase 2: Node Editor (Estimated: 3-4 weeks)
**React Flow integration + NodeEngine (linear execution) + connection validation**

The node editor is the highest-complexity component. The NodeEngine DAG architecture, ParamMapper, and connection validation pipeline must be built correctly from the start ！ retrofitting sub-groups or type validation later (Pitfall 3) is exponentially harder. Zustand store architecture (domain-split stores) and the local-state-for-drag pattern must be established now to prevent the re-render cascade (Pitfall 6).

**Deliverable:** Functional node editor with PromptNode, TextToImageNode, StyleNode, PreviewNode, linear DAG execution, connection validation, and parameter panel. Undo/redo unified with canvas.

#### Phase 3: AI Integration (Estimated: 2-3 weeks)
**Adapter pattern + first real provider + queue + SSE + results on canvas**

The adapter pattern (Pitfall 4) must be the first AI code written, not a refactoring target. The MockAdapter is the default in development (Pitfall 9). Three-dimensional timeouts, retry with jitter, and circuit breaker (Pitfall 5) are foundational AI infrastructure. Image-as-Blob storage and LRU caching (Pitfall 8) prevent browser memory collapse. SSE streaming enables real-time progress.

**Deliverable:** AI generation from the node editor with real API integration, SSE progress streaming, results embedded on the infinite canvas, and cost-safe development defaults.

#### Phase 4: Backend + UI Polish (Estimated: 2-3 weeks)
**Hono server + Drizzle/SQLite + project management + keyboard manager + export**

Build the lightweight Hono backend (AI proxy with hidden API keys, project CRUD, file service). Implement the KeyboardManager to resolve shortcut conflicts (Pitfall 11). Coordinate system normalization (Pitfall 12) ensures canvas and node overlays align at all zoom levels. Export dialog with configurable resolution.

**Deliverable:** Working full-stack application with server-side AI proxy, project management, JWT auth, keyboard shortcut system, and PNG/JPG export.

#### Phase 5: Testing + Performance (Estimated: 1-2 weeks)
**Unit/integration with Vitest, E2E with Playwright, performance profiling**

All AI tests use MockAdapter ！ no real API calls (cost and flakiness). Visual regression tests for canvas rendering and zoom alignment. Performance profiling with Chrome DevTools: track "Frames dropped" and "GPU memory." Zustand selector audit with useShallow enforcement.

**Deliverable:** Test suite covering all critical paths, performance baseline with <16ms frame budget for core interactions.

#### v0.2+: Beyond MVP
**Image-to-video, video editing nodes, template system, cloud sync, Electron, parallel DAG execution, sub-graph groups, node template sharing, asset library**

Video generation is the major market gap (only Runway and Krea address it). Sub-graph support with graduated complexity reveal prevents Node Soup (Pitfall 3) as graphs grow. Cloud sync via D1/R2 enables cross-device workflow. Parallel DAG execution (Promise.all at each topological level) improves generation speed.

### Rationale for Phase Ordering

1. **Canvas first** because every subsequent addition depends on the Excalidraw rendering surface. Fork management discipline must start on day one.
2. **Node editor second** because the node DAG is the product's core IP and the most architecturally complex component. Getting it right before AI integration prevents coupling between the execution engine and provider specifics.
3. **AI integration third** because the adapter pattern and queue infrastructure depend on knowing the node graph parameter shapes and execution model.
4. **Backend fourth** because MVP can function without it entirely (client-only with IndexedDB). The backend is needed for the AI proxy (to hide API keys) and for persistence beyond the browser, but a dev-time API key setup allows AI integration to be built and tested without the backend.
5. **Testing fifth** because performance optimization and test coverage are most effective once all systems are integrated and real interaction patterns are visible.

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Tech stack choices | HIGH | All versions verified against official docs and npm registry data. Breaking changes catalogued with migration paths. |
| Excalidraw as canvas foundation | HIGH | MIT license requirement makes this decisive. tldraw evaluated and rejected ($6K/yr). Fork risk (64.4% cherry-pick failure) is understood and mitigated. |
| React Flow as node editor | HIGH | No viable alternative. v12 actively maintained. Performance patterns (uncontrolled API for drag, fine-grained selectors) documented. |
| Three-layer architecture (Canvas/Node/AI) | HIGH | Validated against Giselle, TapCanvas, Infinite Canvas, AutoGPT production deployments. All use same split-store pattern. |
| Feature positioning | HIGH | 16 competitors analyzed. The "node workflow + infinite canvas + multi-model AI" combination is unique in the 2026 market. |
| MVP scope | HIGH | Table stakes clearly separated from differentiators from anti-features. Tiered priority structure prevents scope creep. |
| AI vendor dependence mitigation | HIGH | Adapter pattern + multi-model routing + PromptBuilder isolation are proven patterns across production AI applications. |
| Performance baselines | MEDIUM | Resolution-tiered rendering and chunk-based culling are sound but unproven in this specific Excalidraw fork context. Performance profiling in Phase 5 will validate. |
| Cloud services (D1/R2) | MEDIUM | D1 is production-ready but the project may never need server-side storage (client-only with IndexedDB may suffice for MVP use cases). Decision deferred. |
| Single-developer viability | MEDIUM | The project scope is ambitious for a solo developer. Success depends on strict scope discipline (one feature per phase, GSD quality gates). The phase structure is designed to prevent the "90% of indie projects never launch" outcome. |

---

## Sources

### Stack
- React 19: https://versionlog.com/react | https://releaserun.com/versions/react/19/
- Vite 8: https://vite.dev/blog/announcing-vite8 | https://voidzero.dev/posts/announcing-rolldown-1-0
- @xyflow/react 12: https://www.npmjs.com/package/@xyflow/react | https://xyflow.com/blog
- Zustand 5: https://github.com/pmndrs/zustand/releases
- TailwindCSS 4: https://tailwindcss.com/blog/tailwindcss-v4-3
- Hono 4: https://hono.dev/docs | https://github.com/honojs/hono
- Drizzle ORM: https://github.com/drizzle-team/drizzle-orm/releases
- Node.js releases: https://github.com/nodejs/Release
- pnpm 11: https://pnpm.io/next/cli/update
- Excalidraw React 19 support: https://github.com/excalidraw/excalidraw/pull/9182
- Cloudflare D1: https://cloudflare-docs.cloudflare-docs.workers.dev/d1/
- Vitest 4: https://vitest.dev/blog/vitest-4-1.html
- shadcn/ui 2026: https://blocks.serp.co/blog/state-of-shadcn-ui-2026
- tldraw vs Excalidraw: https://www.libhunt.com/compare-tldraw-vs-excalidraw

### Features
- ComfyUI: https://blog.comfy.org/
- Midjourney releases: https://updates.midjourney.com/
- Canvas AI tool comparison: https://dev.to/alexmercer_creatives/krea-vs-raelume-two-ai-creative-canvases-two-different-bets-ejl
- AI image generator expectations (G2): https://learn.g2.com/top-ai-image-generator-tools-in-2026-features-trends
- Node-based AI platforms: https://www.basedlabs.ai/articles/node-based-ai-platform-with-api
- Krea AI: https://www.krea.ai/index/realtime-edit
- Leonardo: https://ifttt.com/explore/what-is-leonardo-ai
- Clipdrop: https://www.alphr.com/does-clipdrop-ai-deliver-pro-capabilities-for-image-creation-and-editing/
- Figma AI updates: https://www.figma.com/blog/figjam-your-coding-agents-whiteboard/
- Excalidraw roadmap: https://plus.excalidraw.com/roadmap
- Runway Gen-3: https://resource.digen.ai/runway-ai-video-tutorial-2026/
- Why AI workflow apps fail: https://dev.to/eternalsix/why-most-ai-workflow-apps-fail-4j7m
- Franklin Canvas (open source): https://github.com/BlockRunAI/franklin-canvas

### Architecture
- Giselle AI Workflow architecture (DeepWiki)
- TapCanvas architecture (DeepWiki)
- React Flow Guide Oct 2025 (Velt)
- Hono SSE streaming (tigerabrodi.blog, egoist/ai-proxy, db-studio)
- Zustand best practices 2025 (Alibaba Cloud, Makers Den)
- Infinite Canvas deep-dive (CSDN)
- n0x full-stack browser AI (GitHub)
- AutoGPT PR #10922 (GitHub)

### Pitfalls
- Excalidraw fork maintenance (Ogenrwot & Businge, 2025 academic study)
- Excalidraw modularization PR #9285: https://github.com/excalidraw/excalidraw/pull/9285
- Excalidraw issues #10512, #8136, #10063
- Blender Geometry Nodes complexity: https://dev.to/kirolos_nadi_5c2a23bf3dc9/blenders-procedural-paradox-when-geometry-nodes-become-their-own-bottleneck-271d
- OpenAI gpt-image-1 deprecation: https://community.openai.com/t/gpt-image-1-deprecation-may-break-the-visual-identity-of-my-game-project/1383707
- AI vendor lock-in: https://www.spiceworks.com/ai/your-ai-vendor-can-lock-you-in-faster-than-your-cloud-provider-did/
- Hidden AI API costs: https://www.style3d.com/blog/hidden-api-costs-in-generative-ai-for-fashion-teams/
- Retry/circuit breaker patterns: https://portkey.ai/blog/retries-fallbacks-and-circuit-breakers-in-llm-apps/
- Scope creep in AI projects: https://www.oreilly.com/radar/meet-the-scope-creep-kraken/
- Solo developer lessons: https://dev.to/cee_bosstrust/why-90-of-my-indie-games-never-launch-and-the-application-i-built-to-fix-it-kk0
- React Flow performance: https://reactflow.dev/learn/advanced-use/performance
- Zustand re-render issues: https://github.com/pmndrs/zustand/discussions/2125
- Browser storage limits: https://blog.csdn.net/AYheyheyhey/article/details/155282361
- Multi-API integration pattern: https://dev.to/clipriseapp/how-to-integrate-multiple-ai-generation-apis-without-rebuilding-your-architecture-every-6-months-be3
