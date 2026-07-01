# Domain Pitfalls: AI Creative Canvas

**Domain:** AI-powered creative canvas tool (Excalidraw fork + visual node editor + multi-model AI generation)
**Researched:** 2026-06-29
**Confidence:** HIGH (Context7 + official docs + verified community sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, project abandonment, or major user-facing failures.

---

### Pitfall 1: Excalidraw Fork Drift -- Death by Upstream Merge Conflicts

**What goes wrong:** The Excalidraw fork diverges so far from upstream that merging bug fixes and features becomes impossible. The team either abandons the fork (losing months of work) or maintains a permanently stale codebase with unpatched security issues.

**Why it happens:**
- Fork is based on a `develop` branch instead of a stable release tag.
- Customizations touch core rendering and element systems, creating "open heart surgery" modifications.
- Upstream Excalidraw undergoes structural refactoring (e.g., the March 2025 modularization PR #9285 that split `@excalidraw/element` into its own package).
- Source: 2025 academic study on fork maintenance (Ogenrwot & Businge) found that **Git cherry-pick fails in 64.4% of cases** when porting patches between structurally divergent forks, with **91.6% of failures** caused by upstream refactorings (rename method at 53.1%, rename parameter at 41.1%).

**Consequences:**
- Security patches from upstream never make it into the fork.
- Desired upstream features require manual backporting that takes longer than building from scratch.
- Eventually, the fork is so divergent that the team must choose between a ground-up rewrite or living with the stale base.
- 66% of forks in one study (Marlin firmware) **never pull from upstream after making changes** -- average fork lifespan was only 101 days.

**Prevention:**
1. **Base the fork on a release tag, not `develop`.** Release tags are stable; `develop` may be broken or changing rapidly.
2. **Sync upstream every 2-4 weeks.** Regular small merges are exponentially easier than rare large ones. Set a calendar reminder.
3. **Isolate customizations behind clear interfaces.** Keep Excalidraw core files as untouched as possible. Encapsulate AI elements in a separate layer that communicates via Excalidraw's existing Plugin API or element extension points.
4. **Contribute generic fixes upstream.** Any non-domain-specific bug fix should be PR'd to Excalidraw. If accepted, it becomes the community's maintenance burden.
5. **Document every modification.** Maintain a `FORK_CHANGES.md` listing every file changed and why, so a future developer (or yourself in 6 months) knows what's custom and what's upstream.

**Warning signs:**
- `git merge upstream/master` produces conflicts in >10 files.
- Excalidraw releases pass by without syncing (check the GitHub releases page).
- Team members say "I'm afraid to update Excalidraw" or "the fork is too different now."

**Phase to address: Phase 1 (Core Canvas).** Establish fork management discipline from day one, not after divergence has grown.

Sources:
- https://deepwiki.com/excalidraw/excalidraw
- https://github.com/excalidraw/excalidraw/pull/9285 (modularization refactor)
- https://docs.excalidraw.com/docs/introduction/contributing

---

### Pitfall 2: Canvas Rendering Pipeline Over-Customization Leading to Performance Collapse

**What goes wrong:** Adding AI element types (images, videos) and custom rendering logic to Excalidraw's dual-canvas pipeline causes frame rate drops, janky scrolling, or complete browser tab hangs.

**Why it happens:**
- Excalidraw uses a **dual-canvas architecture**: `StaticCanvas` (drawing elements, cached) and `InteractiveCanvas` (selection UI, handles, overlays). Modifications that blur this separation force expensive full-scene redraws on every interaction.
- Full scene traversal on every viewport update instead of culling to visible elements. Excalidraw issue #10512 documents this exact regression.
- Heavy elements (AI-generated images at 1024x1024+) are rendered at full resolution even when zoomed out to thumbnail size or off-screen.
- The `roughness` renderer (hand-drawn style) adds significant per-element cost -- rendering a simple rectangle costs ~5x more than native Canvas2D due to the rough-js library.

**Consequences:**
- 10+ AI image elements visible = sub-30 FPS.
- Panning/zooming triggers visible white flash while elements re-render.
- Browser tab crashes on canvases with 50+ AI elements.
- Users abandon the tool because it "feels sluggish" compared to native Excalidraw.

**Prevention:**
1. **Keep the dual-canvas separation sacred.** AI element rendering belongs in `StaticCanvas`. Never trigger `StaticCanvas` redraws from transient UI state (hover, selection, drag).
2. **Implement resolution-tiered rendering:**
   - Zoomed out beyond 50%: render AI images as colored rectangles with a label.
   - Zoomed between 50-100%: render at half resolution (downsampled via OffscreenCanvas).
   - Zoomed above 100%: render full resolution.
3. **Use `OffscreenCanvas` for AI image decoding/resizing** off the main thread. Never decode a Blob to ImageBitmap on the render loop.
4. **Implement chunk-based rendering from day one.** Partition the canvas into 2000x2000px chunks. Only render chunks intersecting the viewport plus a 1-chunk buffer.
5. **Profile with Chrome DevTools' Rendering tab** before and after every rendering change. Track "Frames dropped" and "GPU memory" as key metrics.

**Warning signs:**
- `requestAnimationFrame` callbacks exceed 16ms (60 FPS budget).
- Chrome DevTools shows "Major GC" pauses during canvas interactions.
- Users report "the canvas goes white when I scroll fast."
- GPU memory in Chrome Task Manager exceeds 200MB for the tab.

**Phase to address: Phase 1 (Core Canvas).** Performance is a feature -- ship with baseline optimization, not as a post-MVP polish.

Sources:
- https://deepwiki.com/excalidraw/excalidraw/3-action-system
- https://github.com/excalidraw/excalidraw/issues/10512
- https://github.com/excalidraw/excalidraw/issues/8136
- https://github.com/excalidraw/excalidraw/issues/10063

---

### Pitfall 3: Node Engine Complexity Explosion ("Node Soup")

**What goes wrong:** The visual node editor grows into an unmanageable tangle where graphs are impossible to read, debug, or modify. Users (and the developer) give up because "it's easier to just code it directly."

**Why it happens:**
- **No graduated complexity hiding.** Node groups either fully expose or fully hide their internals -- there's no way to show a summary or collapsed view. Users report that following flow through nested groups is "cognitively overwhelming" (source: apm node editor analysis).
- **No higher-order operations.** Node editors rarely support map/filter/fold patterns, so users duplicate subgraphs for every element in a list, creating massive visual trees.
- **Single monolithic graph.** Everything goes into one canvas instead of being split into composable sub-graphs.
- **Inconsistent type system.** Different node types handle type coercion differently -- the same problem Blender's Geometry Nodes face with float math nodes overriding color data when muted (source: Blender Artists forum).
- **No documentation mechanism.** Users can't annotate nodes or connections with explanations, so graphs become self-documenting (they aren't). When the developer returns after 2 weeks, the graph is incomprehensible.

**Consequences:**
- Node graphs with >50 nodes become effectively unmaintainable.
- Debugging a failed pipeline requires tracing through 20+ interconnected nodes.
- Users can't share or reuse sub-graphs because there's no export/import mechanism.
- The developer abandons the node editor and hard-codes AI pipelines instead.

**Prevention:**
1. **Implement sub-graph (node group) support with graduated complexity reveal:**
   - Collapsed: shows as a single node with input/output ports.
   - Expanded in-place: shows internal nodes but dims them.
   - Full expand: opens in a separate tab or overlay.
2. **Support array/map/filter primitives as first-class node types.** This lets users process multiple items without duplicating subgraphs.
3. **Enforce a consistent type system** with explicit type annotations on every port. Validate connections at design time (red underline for type mismatches), not at execution time.
4. **Build annotation support:** Every node and connection can have a text note. Display tooltips on hover.
5. **Limit single-graph complexity:** Size warning at 30 nodes, hard limit at 100 nodes (enforced by requiring sub-graph extraction).
6. **Implement "dirty path" visualization:** Highlight only the nodes that will re-execute when a parameter changes, so users understand the incremental execution scope.

**Warning signs:**
- A single graph exceeds 30 nodes.
- Connections visually overlap or cross more than 3 other connections.
- Developer says "I can't tell what this graph does without tracing every connection."
- Users request "a way to collapse this mess."

**Phase to address: Phase 2 (Node Editor).** Ship with sub-groups and type validation from the start -- retrofitting them later is exponentially harder.

Sources:
- https://dev.to/kirolos_nadi_5c2a23bf3dc9/blenders-procedural-paradox-when-geometry-nodes-become-their-own-bottleneck-271d
- http://apm.bplaced.net/w/index.php?title=Node_editor
- https://blenderartists.org/t/node-inconsistencies/1448865/10
- http://www.diva-portal.org/smash/get/diva2:1972088/FULLTEXT01.pdf

---

### Pitfall 4: AI API Vendor Lock-In and Model Deprecation

**What goes wrong:** The application becomes dependent on a specific AI model's output characteristics, pricing, or API format. When the model is deprecated, repriced, or changed, the application's output quality shifts or breaks entirely.

**Why it happens:**
- **Real examples as of 2026:**
  - OpenAI shut down `gpt-image-1` in May 2026. Developers who tuned prompts, styles, and quality thresholds to that model's "visual fingerprint" had to regenerate entire asset libraries because `gpt-image-2` produced "clearly different" results (source: OpenAI Developer Community).
  - Anthropic retired multiple Claude models on short notice, shifting enterprise pricing to usage-based billing in April 2026.
  - 81% of executives worry about AI vendor dependency, but only 6% could lose their primary AI vendor without disruption (source: Spiceworks, May 2026).
- **Prompt lock-in:** Prompts optimized for one model silently produce garbage on another. Claude prefers XML-style instruction formatting; Gemini expects JSON schemas. Sensitivity gaps can exceed 300% on structured output tasks.
- **Cost opacity:** AI generation costs are non-deterministic. Hidden costs from multi-pass processing (upscaling, inpainting, style transfers) turn one prompt into a chain of billable operations. Wasted/exploratory generations can see 2-3 discarded images for every approved one (source: Style3D).

**Consequences:**
- App suddenly produces worse results because the underlying model was updated.
- AI API costs spike without warning, making the app economically nonviable.
- Users who relied on a specific "style" (e.g., DALL-E 3's aesthetic) lose trust when outputs change.
- Switching providers requires a complete prompt library rewrite and visual QA pass.

**Prevention:**
1. **Adapter pattern (architecture, not afterthought).** Define `AIProvider` interface with `textToImage`, `imageToImage`, etc. Each model gets its own adapter. The adapter handles API format translation, not just endpoint URL swapping.
2. **Multi-model routing from day one.** Even in MVP with only one real provider, the architecture must support a model router that can fall back to alternative providers. Route by content type + user tier + cheapest capable model.
3. **Isolate prompts from models.** Use a `PromptBuilder` that takes abstract parameters (subject, style, mood, format) and produces provider-specific prompts. Don't hard-code "a photorealistic image of X" -- let the adapter choose the phrasing.
4. **Version lock response samples.** When integrating a new model version, generate a curated set of reference outputs and store them. Use these for regression testing when the provider updates.
5. **Budget enforcement with hard caps.** Track cost per generation, per session, per user. Set 80% threshold warnings and hard caps. Cache identical prompts (hash-based).
6. **Mock adapter for development.** Never let real API costs gate development velocity. The MockAdapter should return plausible-looking results from a local cache of pre-generated images.

**Warning signs:**
- Only one AI provider implemented after Phase 3.
- Prompt templates contain model-specific phrasing (e.g., "as generated by DALL-E").
- No way to run the app without an internet connection to AI APIs.
- Developer doesn't know what the monthly AI API bill is.

**Phase to address: Phase 3 (AI Integration).** The adapter pattern must be the first AI code written, not a refactoring target after provider lock-in is already established.

Sources:
- https://community.openai.com/t/gpt-image-1-deprecation-may-break-the-visual-identity-of-my-game-project/1383707
- https://www.spiceworks.com/ai/your-ai-vendor-can-lock-you-in-faster-than-your-cloud-provider-did/
- https://www.informationweek.com/machine-learning-ai/your-ai-vendor-is-now-a-single-point-of-failure
- https://www.cio.com/article/4151360/the-hidden-inflation-of-ai-why-model-collapse-is-a-business-risk.html
- https://www.style3d.com/blog/hidden-api-costs-in-generative-ai-for-fashion-teams/
- https://dev.to/clipriseapp/how-to-integrate-multiple-ai-generation-apis-without-rebuilding-your-architecture-every-6-months-be3

---

### Pitfall 5: AI Request Queue Mismanagement -- Timeout and Retry Storms

**What goes wrong:** Naive retry logic, missing timeouts, or unbounded concurrency turn transient AI API failures into cascading outages, cost explosions, or stuck generations.

**Why it happens:**
- **Single timeout misconfiguration:** One project had a job timeout of 7200s but the proxy's HTTP client defaulted to 120s, causing 94+ false errors per day (source: ollama-queue issue #17).
- **Retries without jitter:** When an upstream failure recovers, all clients retry at the same instant, creating a self-inflicted DDoS. This is what happened during OpenAI's DALL-E outage in 2023 -- only 10% of requests succeeded due to cascading retry waves (source: OpenAI status page).
- **Retrying permanent errors:** 400, 401, 403 errors are retried endlessly, consuming quota and generating cost with zero chance of success.
- **No circuit breaker:** When a provider is degraded, the system keeps hammering it instead of falling back to an alternative model.
- **Streaming failures ignored:** For SSE/WebSocket streaming, a partial failure leaves the user with a truncated response. Standard retry logic produces duplicate or contradictory fragments.

**Consequences:**
- AI generation appears "stuck" with no feedback to the user.
- API bill spikes due to retry traffic on permanent failures.
- Users see "Generation failed" but cannot retry from a meaningful checkpoint.
- Provider rate limits are hit, causing cascading failures across all users.

**Prevention:**
1. **Three-dimensional timeouts:** Connection timeout (5s), Read timeout (60s for image gen, 180s for video), Write timeout (10s). Propagate to the actual HTTP client.
2. **Retry policy (only on retryable errors):**
   - Retry 429 (rate limit), 5xx, network errors only.
   - Never retry 400, 401, 403, 422.
   - Exponential backoff with jitter (base delay 1s, multiplier 2x, jitter 0.5-1.5x, max 3 retries).
3. **Circuit breaker:** After 5 failures in 1 minute, open circuit for 5 minutes, then probe. During open circuit, immediately route to fallback provider.
4. **Total deadline:** 90 seconds maximum for all retries + fallbacks combined. If nothing succeeds in that window, return a clear error to the user.
5. **SSE/WebSocket replay rules:** For streaming failures, define whether to discard partial output and regenerate, or append. Log every truncation.
6. **User-facing progress:** Queue position -> estimated wait -> generating (with spinner) -> done or failed (with specific error and retry button).
7. **Per-user concurrency limits:** 1-2 concurrent generations per user in MVP. Prevent one user's batch from starving others.

**Warning signs:**
- Retry rate (requests with attempt > 1) exceeds 10% of total.
- Users report "my generation has been spinning for 5 minutes."
- API bills show spikes correlated with upstream outages.
- Logs show the same 400/401 error being retried 3+ times.

**Phase to address: Phase 3 (AI Integration).** The queue, retry logic, and circuit breaker are foundational AI infrastructure, not post-MVP polish.

Sources:
- https://portkey.ai/blog/retries-fallbacks-and-circuit-breakers-in-llm-apps/
- https://cloud.tencent.cn/developer/article/2687927
- https://inngest.vercel.app/blog/multi-tenant-ai-platform-flow-control
- https://status.openai.com/incidents/01JMYB7736QH17MQBBH8CA1PQA/write-up
- https://github.com/Kurat0r/ollama-queue/issues/17

---

## Moderate Pitfalls

Problems that cause significant pain but are recoverable with refactoring.

---

### Pitfall 6: Zustand Global Store Re-render Cascade

**What goes wrong:** Every component re-renders on every state change because selectors are too broad, causing 50+ node graphs to run at <10 FPS during any interaction.

**Why it happens:**
- Components subscribe to the entire store with `useStore()` instead of fine-grained selectors.
- Selectors return new object references every call (e.g., `(s) => ({ nodes: s.nodes })`), triggering infinite re-renders.
- React Flow's `useNodesState`/`useEdgesState` replaces the entire nodes array on every drag frame, causing all custom nodes to re-render.
- `JSON.stringify` in the persist middleware runs synchronously on every `set()` call for large state.
- Immer + `applyNodeChanges` conflict: React Flow's mutation breaks Immer's immutable proxy, requiring `structuredClone` workarounds.

**Prevention:**
1. **Fine-grained selectors everywhere.** Every component selects exactly the data it needs: `useStore(s => s.nodes)` not `useStore()`.
2. **Use `useShallow` for object/array selectors.** This prevents reference-instability re-renders.
3. **React Flow: use the uncontrolled API for dragging.** Track node positions in Zustand only on `onNodeDragStop`, not on every `onNodeChange` call. This avoids full-array replacement on every pixel of movement.
4. **Async storage for persist middleware.** Switch from default `localStorage` to IndexedDB-backed storage (e.g., `idb-keyval`) to avoid synchronous `JSON.stringify` on every state change.
5. **Selective persistence with `partialize`.** Only persist the minimum state subset (project data, not transient UI state like selection, hover, or drag position).
6. **Disable Redux DevTools middleware in production.** In development, limit what devtools sees with `partialize`.

**Warning signs:**
- Drag interactions feel sluggish at >30 nodes.
- Chrome DevTools React DevTools shows most components re-rendering on every interaction.
- Console warnings about "Maximum update depth exceeded."
- `JSON.stringify` shows up as a hot path in Chrome DevTools Performance tab.

**Phase to address: Phase 2 (Node Editor) and Phase 5 (Performance).** Code selectors correctly from the start (Phase 2); performance profiling and optimization happens in Phase 5.

Sources:
- https://reactflow.dev/learn/advanced-use/performance
- https://github.com/xyflow/xyflow/issues/5674
- https://github.com/xyflow/xyflow/discussions/4975
- https://github.com/pmndrs/zustand/discussions/2125
- https://github.com/xyflow/xyflow/issues/4253 (Immer conflict)

---

### Pitfall 7: Undo/Redo State Corruption Across Canvas and Node Graph

**What goes wrong:** Undo/redo produces corrupted state, duplicated elements, or lost connections because the canvas history and node graph history are out of sync.

**Why it happens:**
- Canvas (Excalidraw) and node graph (React Flow) maintain **separate undo/redo stacks** that don't coordinate.
- Transient properties leak into history snapshots: React Flow adds `selected`, `dragging`, `measured`, `resizing` to nodes. Saving these creates bloated snapshots that restore incorrectly.
- Drag events create a history entry per pixel of movement, flooding the stack with meaningless intermediate states.
- Cross-context undo: switching between projects then pressing Ctrl+Z restores nodes from the previous project.

**Prevention:**
1. **Single unified undo stack.** Both canvas state and node graph state should be snapshotted together in one atomic action. Use Zustand's temporal middleware (zundo) with a single store wrapping both canvas and node graph.
2. **Filter transient properties with `partialize`:**
   ```typescript
   partialize: (state) => ({
     nodes: state.nodes.map(({ selected, dragging, measured, ...rest }) => rest),
     edges: state.edges.map(({ selected, ...rest }) => rest),
     canvas: state.canvas.elements,
   }),
   ```
3. **Only snapshot on meaningful actions.** Pause history during drag (continuous), snapshot on drop (discrete). Pause during parameter slider drag, snapshot on release.
4. **Scope history to the active project.** Clear history when switching projects; store project-specific undo stacks in IndexedDB alongside project data.
5. **Limit stack depth.** 50 entries max. Enforce with the temporal middleware's `limit` option.
6. **Deep clone before storing.** `JSON.parse(JSON.stringify(snapshot))` or `structuredClone()` to prevent shared-reference bugs.

**Warning signs:**
- Undo restores a node at the wrong position (transient property leak).
- Undo across two projects restores elements from the wrong project.
- History stack grows past 100 entries during a single drag interaction.
- "Undo" after deleting a node recreates the node but not its connections.

**Phase to address: Phase 2 (Node Editor).** The undo system architecture must be designed from the start, not bolted on.

Sources:
- https://github.com/breaking-brake/cc-wf-studio/pull/699
- https://github.com/invoke-ai/InvokeAI/pull/6379
- https://github.com/xyflow/xyflow/issues/4253
- https://juejin.cn/post/7454865700177035283

---

### Pitfall 8: Browser Memory Limits from AI-Generated Media

**What goes wrong:** AI-generated images and videos consume browser memory until the tab crashes. Users lose their work because IndexedDB storage limits are hit or the browser terminates the tab.

**Why it happens:**
- **IndexedDB quotas vary wildly by browser:** Chrome allows up to 60% of disk (~300GB), Firefox caps at 10GB (temporary) or 50% of disk (persistent), Safari prompts the user at just 5MB (source: CSDN storage analysis).
- **Incognito/private mode drops quota to 0-1MB.** If a user works in private browsing, saving fails silently.
- **Base64 encoding inflates image size by 33%.** Storing images as base64 data URLs in canvas state doubles memory: once in the canvas DOM, once in the IndexedDB record.
- **Unreleased object URLs.** Every `URL.createObjectURL()` without a corresponding `URL.revokeObjectURL()` leaks memory. Each blob URL pins the Blob in memory until the document is destroyed.
- **Canvas context references not nullified.** Detached canvas elements still referenced by JS variables are never garbage collected.
- **Large images decoded at full resolution in canvas.** A 4096x4096 DALL-E image decoded as `ImageBitmap` occupies ~67MB in GPU memory. 15 such images = 1GB VRAM.

**Prevention:**
1. **Store images as Blob, not base64.** Use `canvas.toBlob()` instead of `toDataURL()` to save 33% space. IndexedDB natively handles Blob storage.
2. **Implement tiered image storage:**
   - Thumbnail (256px): stored in IndexedDB for instant display.
   - Preview (1024px): stored in IndexedDB, shown while full-res loads.
   - Full resolution: stored via File System Access API (Chrome/Edge 86+) or server-side object storage. Only URL/token in IndexedDB.
3. **Aggressive cache eviction:** LRU cache with a hard memory limit (e.g., 200MB for images). When exceeded, evict least-recently-viewed images to IndexedDB.
4. **Release object URLs religiously:** `URL.revokeObjectURL(url)` in the cleanup function of every component that creates blob URLs.
5. **Monitor storage with `navigator.storage.estimate()`:** Check available quota before saving. Warn user when approaching limits.
6. **Request persistent storage:** `navigator.storage.persist()` can significantly increase quota (especially in Safari).
7. **Handle QuotaExceededError gracefully:** Catch it, delete oldest cached items, retry. If that fails, prompt the user to clear space.
8. **Convert images to WebP when storing.** WebP is 25-35% smaller than PNG with acceptable quality loss for intermediate results.

**Warning signs:**
- Chrome Task Manager shows tab memory >500MB.
- `QuotaExceededError` appears in console logs.
- Images take 2+ seconds to render after loading from IndexedDB.
- Browser tab crashes after generating 10+ high-resolution images.

**Phase to address: Phase 1 (Core Canvas) for basic storage; Phase 3 (AI Integration) for image handling pipeline.**

Sources:
- https://blog.csdn.net/AYheyheyhey/article/details/155282361
- https://www.mindstick.com/interview/34333/what-are-common-reasons-for-quotaexceedederror-in-indexeddb-and-how-do-you-handle-it
- https://cloud.tencent.com/developer/article/2600768

---

### Pitfall 9: AI Generation Cost Mismanagement

**What goes wrong:** The developer deploys with real AI API keys for testing, accidentally runs hundreds of generations during development, and receives a surprise bill for hundreds of dollars.

**Why it happens:**
- No mock adapter in development -- every code change, hot reload, or test triggers real API calls.
- No hard budget cap on the API provider or the application itself.
- "Wasted" generations: prompt exploration and iteration cycles discard 2-3 images for every approved one (source: Style3D).
- Multi-pass processing: upscaling, style transfers, background removal turn one prompt into a chain of billable operations.
- Developer forgets to switch from production API key to a test key.

**Prevention:**
1. **MockAdapter is the default in development.** It returns plausible fake results from a local cache of pre-generated images. Real adapters are only activated by explicit environment variable (`VITE_AI_PROVIDER=mock|openai|...`).
2. **Hard budget cap:** Enforce a monthly API spending limit (e.g., $20/month for development). Use the provider's budget alerts AND application-level tracking.
3. **Cost-per-generation tracking:** Log every API call with model, parameters, and token/image count. Display in a dev dashboard.
4. **Cache identical prompts client-side.** Hash the prompt + parameters, check cache before making an API call. This single change can reduce costs by 40-60% during iterative development.
5. **"Confirm before costly operation" guard.** Any generation above a cost threshold (e.g., video generation at $0.05/second) should require explicit user confirmation.
6. **Use separate API keys for dev and prod.** Dev key has low rate limits and budget caps. Prod key has full limits. Never hard-code keys in source (use `.env` files).

**Warning signs:**
- Developer doesn't know the monthly AI API spend to within $10.
- No logs tracking which prompts generated which outputs.
- Git history shows API keys committed to source control.
- `console.log` shows "API call: DALL-E 3" on every hot reload.

**Phase to address: Phase 3 (AI Integration).** MockAdapter and cost tracking are part of the AI core infrastructure, not optional extras.

Sources:
- https://www.style3d.com/blog/hidden-api-costs-in-generative-ai-for-fashion-teams/
- https://www.analyticsinsight.net/artificial-intelligence/the-real-cost-of-building-ai-features-in-house-and-whats-replacing-it

---

### Pitfall 10: Single-Developer Scope Creep and Momentum Loss

**What goes wrong:** The solo developer adds feature after feature ("while I'm in this file, let me also..."), burning out before reaching MVP. The project joins the 90% of indie projects that never launch.

**Why it happens:**
- **AI makes scope creep worse ("Scope Creep Kraken").** Features now arrive with demos attached. AI removes the friction that used to limit scope growth -- every addition looks manageable in isolation, but the cumulative cost is invisible (source: O'Reilly, "Meet the Scope Creep Kraken").
- **Overengineering:** AI tools suggest enterprise-grade patterns (Singleton + Observer + Command + Factory) when what's needed is a simple function. This adds code complexity without user value.
- **Comprehension debt:** AI generates code the developer can't explain. When it breaks (and it will), debugging takes longer than writing from scratch. The 5-Minute Test: "Can you explain this code to a friend?" If no, you have comprehension debt (source: GameDev.net, IndieHackers).
- **Loss of momentum:** Every hour spent fighting config files, refactoring overengineered abstractions, or debugging AI-generated code is an hour where excitement dies. A 3-day break can kill the project due to "context decay."

**Prevention:**
1. **One feature per phase, shipped.** Do not move to Phase N+1 until Phase N is feature-complete with tests. The GSD phase structure is designed for this -- don't break it.
2. **"If I only ship ONE feature, which is most important?"** This question should precede every development session. Kill everything else for that session.
3. **Understand before merging.** Never merge AI-generated code you cannot explain to a peer (or to yourself in a rubber duck session). The time saved on generation is lost tenfold on debugging.
4. **Timebox explorations.** New technology or approach gets 2 hours of investigation. If it doesn't show clear advantage over the current approach, kill it.
5. **Use the GSD quality gates religiously.** `GStack review` and `GStack qa` are not optional -- they prevent the accumulation of technical debt that kills solo projects.
6. **Celebrate small wins.** Every completed task gets acknowledged (a git commit, a checkmark, a note in MEMORY.md). Momentum is emotional, not just technical.
7. **Risk of a 3-day break: prepare a "resume pack."** Before any break longer than a day, write a brief note in MEMORY.md summarizing:
   - What was I working on?
   - What's the next thing to do?
   - What decisions were pending?
   This prevents context decay from killing momentum.

**Warning signs:**
- More than 3 features "in progress" simultaneously.
- Developer says "I'll clean this up later" more than once per week.
- Project folder contains `-v2`, `-final`, `-real-final` files.
- No commits for 5+ days.
- Git log shows "wip" and "fix" messages instead of descriptive commit messages.

**Phase to address: All phases.** This is a meta-pitfall that applies throughout the entire project lifecycle.

Sources:
- https://www.oreilly.com/radar/meet-the-scope-creep-kraken/
- https://www.forbes.com/sites/jodiecook/2026/04/09/the-vibe-coding-trap-ambitious-founders-fall-into-and-what-to-do-about-it/
- https://www.indiehackers.com/post/i-use-ai-for-90-of-my-code-heres-what-it-still-can-t-fix-e53dcc82e7
- https://dev.to/cee_bosstrust/why-90-of-my-indie-games-never-launch-and-the-application-i-built-to-fix-it-kk0
- https://dev.to/arbabyousaf/5-things-i-learned-shipping-clean-digital-products-as-a-solo-developer-and-why-momentum-is-io

---

## Minor Pitfalls

Problems that are annoying but have straightforward fixes.

---

### Pitfall 11: Keyboard Shortcut Conflicts Between Excalidraw and Node Editor

**What goes wrong:** Ctrl+Z, Delete, Ctrl+C/V behave differently depending on whether focus is on the canvas or the node editor. Users get confused; data gets lost.

**Why it happens:** Excalidraw has its own keyboard handler. React Flow has its own. The application has global shortcuts (Ctrl+S, Ctrl+Z). They conflict when both are visible simultaneously.

**Prevention:** Route all keyboard events through a single `KeyboardManager` that checks `document.activeElement` before dispatching. Text inputs get native handling; canvas gets Excalidraw handling; node editor gets React Flow handling; global shortcuts (save, undo) always work. Document the key bindings in the UI help panel.

**Phase: Phase 4 (UI Polish).**

---

### Pitfall 12: Excalidraw and React Flow Rendering at Different Resolutions

**What goes wrong:** When the node editor overlay is shown on top of the Excalidraw canvas, elements from the two layers don't align at non-100% zoom levels due to different DPI scaling calculations.

**Why it happens:** Excalidraw uses its own zoom/pan transform system. React Flow uses a different coordinate system. When both are visible simultaneously (nodes floating over canvas), their transforms drift.

**Prevention:** Normalize coordinate systems early. Create a shared transform utility that converts between Excalidraw coordinates, React Flow coordinates, and screen coordinates. Test at 50%, 100%, 200%, and 400% zoom levels. Add visual regression tests that screenshot the alignment.

**Phase: Phase 2 (Node Editor) integration with Phase 1 (Canvas).**

---

### Pitfall 13: WebSocket Connection Lifetime Management for AI Progress

**What goes wrong:** WebSocket connections for AI generation progress are not cleaned up when the user navigates away, closes the tab, or the generation completes. Zombie connections pile up, wasting server resources.

**Prevention:** Implement a `ConnectionManager` that:
- Associates each WebSocket with a generation ID.
- Closes the connection when generation completes or errors.
- Uses `onbeforeunload` and `visibilitychange` to clean up on tab close.
- Implements heartbeat/ping every 30 seconds; close on missed heartbeat.
- Limits open connections per user (max 3).
- Logs and reaps zombie connections on the server side (no client heartbeat for 60s = close).

**Phase: Phase 3 (AI Integration).**

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| **P1: Excalidraw Fork** | Fork drift (Pitfall 1), rendering performance (Pitfall 2) | Sync upstream every 2-4 weeks; tiered resolution rendering from day one |
| **P2: Node Editor** | Node Soup (Pitfall 3), re-render cascade (Pitfall 6), undo corruption (Pitfall 7) | Sub-groups + type validation built in; fine-grained Zustand selectors; unified undo stack |
| **P3: AI Integration** | Vendor lock-in (Pitfall 4), retry storms (Pitfall 5), cost explosion (Pitfall 9), memory leaks (Pitfall 8) | Adapter pattern first; circuit breaker + jitter; MockAdapter default in dev; Blob storage + LRU cache |
| **P4: Backend + UI** | Keyboard shortcut conflicts (Pitfall 11), coordinate system drift (Pitfall 12) | Central KeyboardManager; shared transform utility |
| **P5: Testing** | Testing with real AI API calls (cost, flakiness) | All AI tests use MockAdapter; dedicated test fixtures for prompt variations |
| **All phases** | Scope creep + momentum loss (Pitfall 10) | GSD phase gates are mandatory; 5-Minute Test for AI-generated code; celebrate every completed task |

---

## Summary: The "Watch List"

These three pitfalls are the most likely to cause a project-threatening crisis:

1. **Fork Drift (Pitfall 1):** Sync Excalidraw upstream every 2-4 weeks. A 6-month gap will create a painful merge that may never happen.
2. **Vendor Lock-In (Pitfall 4):** The adapter pattern is not optional. One model deprecation notice could force a rewrite of the entire AI layer.
3. **Scope Creep (Pitfall 10):** Every "while I'm here" addition delays the MVP. Ship the minimum thing first. A live app with one feature beats a broken repo with 20 half-finished features.

Sources:
- Project architecture document risk section
- Excalidraw GitHub issues
- OpenAI Developer Community model deprecation discussions
- Blender Geometry Nodes post-mortems
- Zustand and React Flow community issue trackers
- Browser storage limit documentation
- Solo developer post-mortems on IndieHackers and DEV.to
