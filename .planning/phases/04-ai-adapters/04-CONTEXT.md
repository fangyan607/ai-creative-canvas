# Phase 4: AI Adapters — Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

构建 AI 适配器层 — 通过适配器模式接入多个 AI 图像生成提供商，提供 Prompt 模板系统和 BYOK（自带密钥）能力。适配器实现标准的 `AiAdapter` 接口，供 Phase 5（AI Execution Infrastructure）桥接到节点引擎。

**本阶段不包含：** AI 请求队列、速率限制、SSE 流式推送、引擎桥接 — 这些全部属于 Phase 5。

**Requirements covered:** AI-01 (OpenAI DALL-E 3 文生图), AI-02 (Stability.ai 文生图/图生图), AI-03 (MockAdapter), AI-05 (BYOK), AI-06 (Prompt 模板系统)

**Success criteria:**
1. User can select an AI provider (MockAdapter, OpenAI DALL-E 3, or Stability.ai) from a dropdown and generate a text-to-image result
2. User can configure a custom API key and base URL for each provider (BYOK mode)
3. User can use provided prompt templates to construct effective generation prompts with variable substitution
4. Changing between AI providers does not require code changes or restarts (adapter interface is stable)
5. While offline or during development, MockAdapter returns realistic test images without any API call
</domain>

<decisions>
## Implementation Decisions

### 适配器接口设计 (AiAdapter Interface)
- **D-01: Class-based adapter pattern** — Each AI provider is implemented as a class that extends/implements a unified `AiAdapter` abstract base/interface. This is the classic OOP adapter pattern, consistent with the project's adapter mode design decision (PROJECT.md Key Decisions).
- **D-02: Mandatory interface methods** — Every adapter must implement:
  - `execute(nodeData, inputs, onStoreImage?)` → `AdapterResult` — execute generation (matches engine Executor signature with extensions)
  - `testConnection()` → `ConnectionResult` — verify API key validity and endpoint reachability, critical for BYOK UX
  - `getModels()` → `ModelDescriptor[]` — list supported models with parameter constraints (dimensions range, step limits, etc.)
  - `getConfigSchema()` → `ConfigField[]` — provider configuration schema (required fields, validation rules); used to auto-generate config UI
- **D-03: Image output via storeImage callback** — Adapter's `execute()` receives a `storeImage(blob: Blob): Promise<string>` callback. It stores the generated image via this callback and returns the resulting `imageBlobId` in `AdapterResult`. The adapter never manages storage itself — it delegates blob persistence to the caller. This unifies the storage path with Phase 1's Blob storage pattern (D-13).
- **D-04: Standardized AdapterResult structure** — All adapters return a uniform result shape:
  ```ts
  interface AdapterResult {
    imageBlobId: string       // Blob reference from storeImage callback
    width: number             // actual image width (may differ from request)
    height: number            // actual image height
    seed: number | null       // seed used (for reproducibility)
    model: string             // actual model used
    timing: number            // wall clock execution time in ms
  }
  ```
  - On failure: adapter throws an `AiAdapterError` with `code` (e.g., `'auth_failed'`, `'rate_limited'`, `'server_error'`, `'invalid_params'`) and a human-readable `message`
- **D-05: Progress reporting via EventEmitter** — Each adapter extends `EventEmitter`. During `execute()`, it emits events:
  - `'progress'` with `{ percent: number, stage: string }` — stage describes current step e.g. `"sending_request"`, `"processing"`, `"downloading"`
  - `'error'` with `{ code: string, message: string }` — partial errors before execution completes
  - `'done'` with `AdapterResult` — final completion event
  - Phase 5 will wire these events into SSE streaming to the frontend. Phase 4 defines the contract but doesn't consume it.
- **D-06: Provider metadata exposed statically** — Each adapter class exposes static metadata:
  ```ts
  static providerId: string           // e.g., 'openai', 'stability', 'mock'
  static providerName: string         // e.g., 'OpenAI'
  static defaultBaseUrl: string       // official API endpoint
  ```

### 包结构 (Package Structure)
- **D-07: New `packages/ai-core` workspace package** — All adapter code lives in a new monorepo package at `packages/ai-core/`, co-located with existing packages (`excalidraw/`, `node-editor/`, `shared/`). Structure:
  ```
  packages/ai-core/
  ├── src/
  │   ├── adapters/
  │   │   ├── openai.adapter.ts      — OpenAI DALL-E 3 adapter
  │   │   ├── stability.adapter.ts   — Stability.ai adapter
  │   │   └── mock.adapter.ts        — MockAdapter for offline/demo
  │   ├── interfaces/
  │   │   ├── AiAdapter.ts           — Abstract base class / interface
  │   │   └── types.ts               — AdapterResult, ModelDescriptor, ConfigField, etc.
  │   ├── prompt/
  │   │   ├── templateEngine.ts      — Template parser/renderer (Handlebars-compatible)
  │   │   └── templates.ts           — All template definitions (TS constants)
  │   ├── config/
  │   │   └── providerStore.ts       — BYOK config CRUD (IndexedDB + encryption)
  │   └── index.ts                   — Package entry (public API)
  ├── package.json
  └── tsconfig.json
  ```

### BYOK 配置方案 (BYOK Mode)
- **D-08: IndexedDB 持久化存储** — Provider configurations (API keys, base URLs, selected model) stored in IndexedDB. Uses existing Dexie.js database at `apps/web/src/indexedb/db.ts`. A new `providerConfig` table or field added alongside the existing `projects` table — decided by planner.
- **D-09: Web Crypto API 前端加密** — API Keys encrypted at rest using `SubtleCrypto`. Key derivation via PBKDF2 with a salt stored alongside ciphertext. The encryption key itself is derived from a user-provided master passphrase (stored in session memory only). This ensures keys are never stored in plaintext in IndexedDB, while keeping complexity manageable.
  - **Planner discretion:** If key derivation from master passphrase adds too much UX friction for MVP, a simpler AES-GCM with a hardcoded app-level key (still Web Crypto) can be used as a lightweight alternative, with upgrade path to passphrase-based protection later.
- **D-10: Per-provider custom base URL** — Each provider configuration includes a `baseUrl` field (defaults to the provider's `defaultBaseUrl`). Users can override it for proxy/mirror scenarios (e.g., OpenAI domestic proxy in China). URL validation on save.

### Prompt 模板系统 (Prompt Builder)
- **D-11: Handlebars-compatible `{{variable}}` syntax** — Templates use Handlebars-style double-brace syntax for variable substitution. Implemented as a lightweight custom parser (no full Handlebars dependency) supporting:
  - `{{variable}}` — simple variable substitution with HTML escaping
  - `{{{variable}}}` — raw/unescaped substitution
  - `{{#if condition}}...{{/if}}` — conditional blocks
  - `{{#each list}}...{{/each}}` — iteration over arrays
  - Variable path resolution: `{{node.data.prompt}}`, `{{upstream.generatedImageId}}`
- **D-12: 集中式 TypeScript 常量管理** — All prompt templates stored in a single TypeScript constants file (`packages/ai-core/src/prompt/templates.ts`). Indexed by `{ providerId: string, purpose: string }` for easy lookup. Static, type-safe, no runtime DB queries for MVP.
  - Template definition shape:
    ```ts
    interface PromptTemplate {
      id: string
      providerId: string
      purpose: string              // e.g., 'text-to-image', 'style-transfer'
      label: string                // human-readable name
      template: string             // Handlebars-compatible template string
      defaultVariables: Record<string, unknown>  // default values for template variables
      description?: string
    }
    ```
- **D-13: 四类变量源** — Template variables can come from:
  1. **Node parameters** — Fields on TextToImageNodeData, PromptNodeData, StyleNodeData (prompt text, width/height, seed, style preset)
  2. **Upstream node outputs** — Output from preceding nodes in the graph (e.g., imageBlobId from prior generation)
  3. **Global context** — Canvas metadata, project info, random seed generator, timestamp
  4. **System presets** — Built-in role definitions, quality modifiers, negative prompt fragments
- **D-14: 模板按 provider + purpose 索引** — `templates.ts` exports `getTemplate(providerId, purpose) → PromptTemplate | undefined` and `listTemplates(providerId) → PromptTemplate[]` for discovery.

### MockAdapter 行为
- **D-15: 彩色矩形 + 文字标注** — Output image is a colored rectangle (color derived from prompt string hash) with text overlay showing:
  - Prompt text (truncated)
  - Provider name ("MockAdapter")
  - Seed number
  - Dimensions (width × height)
  - "MOCK" watermark
  - Dimensions match the requested `width × height` for realistic sizing
  - Generated as canvas-drawn PNG blob via `OffscreenCanvas` or `Canvas2D` API
- **D-16: 双模式支持** —
  - **Offline fallback mode:** Automatically activated when no real API key is configured for any provider. Nodes execute with MockAdapter by default, enabling full development flow without any real API call.
  - **Manual demonstration mode:** User can explicitly select "MockAdapter" from the provider dropdown in the UI, even when real API keys are configured. This allows testing and demonstration of the full pipeline (engine → adapter → result → preview) without incurring API costs.

### Claude's Discretion
- Provider config UI implementation details (the `getConfigSchema()` return value drives auto-generated form fields)
- Encryption implementation detail (planner chooses between passphrase-based vs app-level key approaches per D-09 note)
- Exact canvas rendering helper for MockAdapter (OffscreenCanvas with text measurement, color algorithm)
- Decision on whether `providerConfig` is a new Dexie table or a field on the existing `projects` table
- `storeImage` callback signature detail (whether caller passes the callback or adapter accesses a global store registry)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Boundary & Requirements
- `.planning/ROADMAP.md` §Phase 4 — Goal, success criteria, dependency structure
- `.planning/REQUIREMENTS.md` — AI-01 (OpenAI DALL-E 3), AI-02 (Stability.ai), AI-03 (MockAdapter), AI-05 (BYOK), AI-06 (Prompt Builder)

### Prior Phase Decisions (Mandatory Reading)
- `.planning/phases/01-core-canvas/01-CONTEXT.md` — D-11 (AIElement type), D-12 (AIElement rendering), D-13 (Blob storage for images), D-19 (LRU image cache)
- `.planning/phases/02-node-editor-interface/02-CONTEXT.md` — D-32 (node types), D-37 to D-41 (PropertyPanel parameter fields, model dropdown selection)
- `.planning/phases/03-node-engine/03-CONTEXT.md` — D-01 (sync-first engine with async stubs), D-09 (engine state store), D-03 (execution status UI)

### Technical Research & Architecture
- `.planning/research/ARCHITECTURE.md` — Three-layer architecture, adapter pattern, state patterns
- `.planning/research/PITFALLS.md` — Pitfall 4 (API Cost Blow-up, mitigation via MockAdapter), Pitfall 5 (Prompt Fragility), Pitfall 9 (Key Leakage, BYOK design)
- `.planning/PROJECT.md` — Adapter pattern decision, AI provider selection, constraints (MVP only 2-3 providers, API Mock mode for dev)

### Existing Code (Read for Patterns)
- `packages/shared/src/types/canvas.ts` — AIElement type (`prompt`, `aiProvider`, `generationParams`, `generationStatus`, `imageBlobId`)
- `packages/shared/src/types/nodeGraph.ts` — TextToImageNodeData (`model` options: `dall-e-3`, `stable-diffusion-xl`, `stable-diffusion-3`), StyleNodeData (`stylePreset` options)
- `apps/web/src/engine/types.ts` — `Executor`, `ExecutorResolver`, `ExecutorInput`, `ExecutorOutput`, `ExecutionResult` types
- `apps/web/src/engine/resolvers.ts` — `createDefaultResolvers()` — Phase 4 will replace `text-to-image` and `style` stub resolvers with real AI adapter calls
- `apps/web/src/stores/engineStore.ts` — Engine state store pattern (fine-grained selectors, serialize/loadSerialized)
- `apps/web/src/stores/stubs/aiQueueStore.ts` — Current stub, Phase 5 will fill
- `packages/excalidraw/FORK_CHANGES.md` — Must be updated if adapter integration touches Excalidraw rendering

### Configuration
- `.planning/config.json` — Workflow configuration
- `CLAUDE.md` — Project instructions, tech stack constraints
- `.planning/STATE.md` — Current project state

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Engine Executor resolver pattern** (`apps/web/src/engine/resolvers.ts`) — The `createDefaultResolvers()` function returns an `ExecutorResolver` (Map of NodeType → Executor). Phase 4 does NOT replace this mechanism — it provides the real adapter implementations that Phase 5 bridges into the engine. Phase 5 will swap out the `text-to-image` and `style` resolvers from stubs to real adapters.
- **AIElement type** (`packages/shared/src/types/canvas.ts`) — Already has `prompt`, `aiProvider`, `generationParams`, `generationStatus`, `imageBlobId`. Phase 4 adapters produce image blob IDs that fill this element.
- **TextToImageNodeData** (`packages/shared/src/types/nodeGraph.ts`) — Has `model` field with pre-set options (`dall-e-3`, `stable-diffusion-xl`, `stable-diffusion-3`), `width`, `height`, `seed`. Adapters consume these.
- **Blob storage infrastructure** — Phase 1 established blob storage pattern. The `storeImage` callback in D-03 reuses this infrastructure.
- **Dexie.js database** (`apps/web/src/indexedb/db.ts`) — Existing database with `projects` table. Can extend with `providerConfig` table or field.

### Established Patterns
- Zustand + Immer stores with fine-grained `useShallow` selectors
- Workspace package structure (`packages/*/` with `package.json` and `tsconfig.json`)
- `serialize()` / `loadSerialized()` interface for state stores
- `structuredClone()` for snapshot deep copies
- Blob storage for images (base64 avoided)
- FORK_CHANGES.md for all Excalidraw modifications

### Integration Points for Phase 4
- **New `packages/ai-core/` package** — Needs to be wired into pnpm workspace (`pnpm-workspace.yaml`), added as dependency in `apps/web/package.json`
- **IndexedDB** — Extend Dexie schema for provider config storage
- **PropertyPanel** — Phase 2's parameter panel will need a provider dropdown + model selector that reads from adapter's `getModels()`. This is an App.tsx integration (provider selection from dropdown per SC-1)
- **NodeGraphStore** — When user changes provider in PropertyPanel, the selected provider ID flows into TextToImageNodeData.model

### What Phase 5 Expects From Phase 4
- `AiAdapter` interface (abstract class/interface) that Phase 5 can import and bridge to engine executors
- Concrete adapter instances that can be instantiated with user config and called via `execute()`
- `ProviderStore` with CRUD for provider configs that Phase 5 reads during execution
- `TemplateEngine` that Phase 5's bridge uses to construct final prompts before calling adapter.execute()

</code_context>

<specifics>
## Specific Ideas

- **Adapter registry** — A central `AdapterRegistry` singleton in `packages/ai-core` where all adapters self-register. `registerAdapter(OpenAiAdapter)` at bootstrap. Phase 5 queries the registry to find the right adapter for a node's selected provider.
- **Provider config as auto-generated form** — `getConfigSchema()` returns field definitions (label, type, required, validation regex, placeholder) that `PropertyPanel` or a Settings page renders into a form. Users input API keys and base URLs through this form.
- **Connection test feedback** — When user saves provider config, auto-run `testConnection()` and show success/failure toast. Red "invalid key" indicator on the provider card.
- **MockAdapter as first-class citizen** — The MockAdapter should be fully selectable in the UI, not a hidden fallback. This lets users demonstrate the entire creative flow (create nodes → connect → execute → preview → apply to canvas) without any API costs, which is essential for a single-developer project on a budget.
- **Template editor UX** — For Phase 7, a visual template editor where users can customize prompts with variables. Phase 4 only needs the template data structure and renderer.
</specifics>

<deferred>
## Deferred Ideas

- **Visual prompt template editor** — Phase 7 UI feature
- **User-customizable templates at runtime** — IndexedDB-stored templates that users create/modify. Phase 4 uses TypeScript constants only (D-12).
- **More AI providers beyond 3** (Replicate, Midjourney API, etc.) — v0.2+
- **MockAdapter image fidelity upgrade** — If geometric patterns or AI-like compositions are later desired, MockAdapter visual can be upgraded without interface changes.
- **Team-shared API Keys** — Key management is single-user in MVP. Multi-user and team key sharing is v0.2+.
</deferred>

---

*Phase: 04-ai-adapters*
*Context gathered: 2026-07-01*
