# Phase 4: AI Adapters - Research

**Researched:** 2026-07-01
**Domain:** AI Image Generation API Integration, Adapter Pattern, BYOK Encryption, Prompt Template Engine
**Confidence:** HIGH

## Summary

Phase 4 builds the AI adapter layer -- a clean adapter pattern over OpenAI DALL-E 3 and Stability.ai APIs, plus a MockAdapter for offline/demo use. The adapters live in a new `packages/ai-core` workspace package and implement a unified `AiAdapter` abstract class/interfaces. API keys are encrypted at rest in IndexedDB using the Web Crypto API (AES-256-GCM + PBKDF2). Prompt templates use Handlebars-compatible `{{variable}}` syntax implemented via the lightweight `tempura` library (<1.3KB gzip) rather than full Handlebars (82KB). All adapter calls are direct `fetch()` -- no official SDKs needed, saving 80-250KB bundle size.

**Primary recommendation:** Native `fetch()` calls for both providers, `tempura` for template engine, Web Crypto API for key encryption, and OffscreenCanvas for MockAdapter image generation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01: Class-based adapter pattern** -- Each AI provider is implemented as a class that extends/implements a unified `AiAdapter` abstract base/interface. This is the classic OOP adapter pattern.
- **D-02: Mandatory interface methods** -- Every adapter must implement: `execute(nodeData, inputs, onStoreImage?)`, `testConnection()`, `getModels()`, `getConfigSchema()`.
- **D-03: Image output via storeImage callback** -- Adapter's `execute()` receives a `storeImage(blob: Blob): Promise<string>` callback. The adapter never manages storage itself.
- **D-04: Standardized AdapterResult structure** -- All adapters return a uniform result shape with `imageBlobId`, `width`, `height`, `seed`, `model`, `timing`. On failure: throws `AiAdapterError`.
- **D-05: Progress reporting via EventEmitter** -- Each adapter extends `EventEmitter`. Events: `'progress'`, `'error'`, `'done'`.
- **D-06: Provider metadata exposed statically** -- `static providerId`, `static providerName`, `static defaultBaseUrl`.
- **D-07: New `packages/ai-core` workspace package** -- Structure with `adapters/`, `interfaces/`, `prompt/`, `config/` subdirectories.
- **D-08: IndexedDB persistence** -- Provider configs stored in IndexedDB via Dexie.js. A new `providerConfig` table or field decided by planner.
- **D-09: Web Crypto API for encryption** -- API Keys encrypted at rest via SubtleCrypto. PBKDF2 key derivation. Planner discretion on passphrase-based vs app-level key.
- **D-10: Per-provider custom base URL** -- Each config includes a `baseUrl` field with URL validation on save.
- **D-11: Handlebars-compatible `{{variable}}` syntax** -- Templates use double-brace syntax. Lightweight parser (no full Handlebars).
- **D-12: Centralized TypeScript constant templates** -- All templates in `packages/ai-core/src/prompt/templates.ts`. Static, type-safe.
- **D-13: Four categories of variable sources** -- Node parameters, upstream outputs, global context, system presets.
- **D-14: Template indexed by providerId + purpose** -- `getTemplate(providerId, purpose)` and `listTemplates(providerId)`.
- **D-15: MockAdapter colored rectangle + text** -- Canvas-drawn PNG with prompt, provider name, seed, dimensions, watermark.
- **D-16: Dual-mode MockAdapter** -- Offline fallback (auto-activate when no real API key) + Manual demo mode (explicit selection).

### Claude's Discretion
- Provider config UI implementation details (the `getConfigSchema()` return value drives auto-generated form fields)
- Encryption implementation detail (planner chooses between passphrase-based vs app-level key approaches per D-09 note)
- Exact canvas rendering helper for MockAdapter (OffscreenCanvas with text measurement, color algorithm)
- Decision on whether `providerConfig` is a new Dexie table or a field on the existing `projects` table
- `storeImage` callback signature detail (whether caller passes the callback or adapter accesses a global store registry)

### Deferred Ideas (OUT OF SCOPE)
- Visual prompt template editor -- Phase 7 UI feature
- User-customizable templates at runtime -- Phase 4 uses TypeScript constants only
- More AI providers beyond 3 (Replicate, Midjourney API, etc.) -- v0.2+
- MockAdapter image fidelity upgrade -- can be upgraded without interface changes
- Team-shared API Keys -- Multi-user key management is v0.2+
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | OpenAI DALL-E 3 text-to-image adapter | OpenAI API endpoint, request/response format documented below |
| AI-02 | Stability.ai text-to-image and image-to-image adapter | Stability v1 (SDXL) and v2beta (SD3/SD3.5) endpoints documented |
| AI-03 | MockAdapter for offline debugging | OffscreenCanvas pattern, dual-mode design |
| AI-05 | BYOK (Bring Your Own Key) with custom API URL | Web Crypto API encryption pattern, Dexie.js schema extension |
| AI-06 | Prompt builder and template system | Tempura library (Handlebars-compatible), 4 variable source categories |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tempura | 0.4.1 | Template engine | ~1.3KB gzip, Handlebars-compatible syntax, 7x faster render than Handlebars [VERIFIED: npm registry] |
| Dexie.js | ^4.4.4 | IndexedDB layer | Already in project, D-08 mandates using existing database |
| Web Crypto API | native | Client-side encryption | No library needed -- browser built-in SubtleCrypto [VERIFIED: MDN] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js | v23.8.0 | Runtime | Current installed version (v24 LTS recommended in CLAUDE.md but v23 available) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tempura (1.3KB) | Full Handlebars 4.7.9 (82KB) | Handlebars adds ~80KB to bundle for features Phase 4 doesn't need (partials, helpers, precompilation). Handlebars is 7x slower [CITED: tempura GitHub benchmarks] |
| tempura (1.3KB) | Custom regex parser | Building a correct Handlebars-compatible parser from scratch has edge cases (nested conditionals, escaped braces, path resolution). Tempura handles all D-11 requirements in 1.3KB -- faster than writing our own, smaller than Handlebars |
| Direct fetch() | OpenAI SDK (openai npm, ~80KB min) | SDK adds bundle size, rate limiting logic we don't need, and streaming support for chat models. DALL-E 3 single-image generation is a single POST with two possible response formats -- fetch() is 10 lines vs importing a full SDK |
| Direct fetch() | Stability.ai SDK (wave-sdk, ~250KB min) | Stability SDK is heavy with WebSocket streaming, video support, and model management. Image generation is a single POST. fetch() + FormData is simpler [CITED: stability npm package weight] |
| PBKDF2+AES-GCM | Derived via passphrase | Passphrase UX adds friction for MVP. Hardcoded app-level key (still Web Crypto) is simpler for MVP, with upgrade path to passphrase later. Planner discretion per D-09 |
| Dexie new table | Dexie field on projects | New table is cleaner separation (provider configs are not project-scoped), avoids unbounded field growth. But if planner wants to scope configs per-project, a field works too [DISCRETION] |

**Installation:**
```bash
cd packages/ai-core && pnpm add tempura
```

**Version verification:**
```
tempura@0.4.1 -- published 2023 (stable, no known issues)
```

## Architecture Patterns

### Recommended Project Structure
```
packages/ai-core/
├── src/
│   ├── adapters/
│   │   ├── base.ts                  — AiAdapter abstract class, types
│   │   ├── openai.adapter.ts        — OpenAI DALL-E 3 adapter
│   │   ├── stability.adapter.ts     — Stability.ai adapter (v1 SDXL + v2beta SD3)
│   │   └── mock.adapter.ts          — MockAdapter for offline/demo
│   ├── interfaces/
│   │   ├── AiAdapter.ts             — Abstract base class
│   │   └── types.ts                 — AdapterResult, ModelDescriptor, ConfigField, etc.
│   ├── prompt/
│   │   ├── templateEngine.ts        — Tempura wrapper for Handlebars-compatible rendering
│   │   └── templates.ts             — Template definitions (TS constants)
│   ├── config/
│   │   └── providerStore.ts         — BYOK config CRUD (IndexedDB + Web Crypto encryption)
│   ├── registry.ts                  — AdapterRegistry singleton
│   └── index.ts                     — Package entry (public API)
├── package.json
└── tsconfig.json
```

### Pattern 1: Adapter Base Class with EventEmitter
**What:** Each provider extends an abstract `AiAdapter` base class. The base provides shared logic (URL validation, timing, error wrapping) while subclasses implement provider-specific API calls.

**When to use:** All AI providers -- guarantees consistent interface behavior.

**Example:**
```typescript
// Source: Derived from CONTEXT.md D-01 through D-05 decisions

import { EventEmitter } from 'eventemitter3' // or Node's EventEmitter in browser context

export interface AdapterResult {
  imageBlobId: string
  width: number
  height: number
  seed: number | null
  model: string
  timing: number // ms
}

export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'password' | 'number' | 'select'
  required: boolean
  defaultValue?: unknown
  placeholder?: string
  validationRegex?: string
  options?: string[]
}

export abstract class AiAdapter extends EventEmitter {
  abstract readonly providerId: string
  abstract readonly providerName: string
  abstract readonly defaultBaseUrl: string

  abstract execute(
    nodeData: Record<string, unknown>,
    inputs: Record<string, unknown>,
    onStoreImage?: (blob: Blob) => Promise<string>,
  ): Promise<AdapterResult>

  abstract testConnection(): Promise<{ success: boolean; message: string }>

  abstract getModels(): Array<{
    id: string
    name: string
    supportedSizes: string[]
    maxDimensions: { width: number; height: number }
    supportsImageToImage: boolean
    supportsSeed: boolean
  }>

  abstract getConfigSchema(): ConfigField[]
}
```

### Pattern 2: ProviderConfig Store with Encrypted Keys
**What:** A service layer over Dexie.js that encrypts API keys before writing to IndexedDB and decrypts them on read. Encrypted payload + IV + salt stored in a `providerConfig` table.

**When to use:** All BYOK key persistence operations.

**Example:**
```typescript
// Source: Web Crypto API best practices [ASSUMED]

// Derive encryption key from app-level key (simpler MVP approach, D-09 note)
const APP_ENCRYPTION_KEY_RAW = 'ac-canvas-v0.1-app-key-placeholder'

async function getEncryptionKey(): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(APP_ENCRYPTION_KEY_RAW),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('ai-canvas-provider-salt'),
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptApiKey(apiKey: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(apiKey),
  )
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  }
}
```

### Anti-Patterns to Avoid
- **SDK over fetch():** Do NOT import `openai` or `stability-ai` npm packages. Both add significant bundle weight (80-250KB) for logic that doesn't apply to image generation (chat streaming, model management, WebSocket connections). A single `fetch()` call with JSON body (OpenAI) or FormData (Stability) handles both providers [ASSUMED].
- **Full Handlebars:** Do NOT import `handlebars` (~82KB gzip). Use `tempura` (1.3KB) which implements the same `{{ }}` syntax, `#if`, `#each` directives, and is 7x faster at rendering [VERIFIED: tempura GitHub].
- **Base64 images in adapters:** Adapters should return `Blob` objects. The `storeImage` callback handles persistence. Do NOT convert images to base64 data URLs -- this wastes ~33% space per D-13.
- **API keys in localStorage:** API keys MUST NOT be stored in `localStorage` -- it's accessible via XSS and synchronous. Use IndexedDB + Web Crypto encryption per D-09 [CITED: OWASP guidelines].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Handlebars-compatible template rendering | Custom regex parser | tempura 0.4.1 | Edge cases in nested conditionals, escaped delimiters, path resolution. Tempura is 1.3KB and handles all requirements |
| API key encryption | Homebrew crypto | Web Crypto API (SubtleCrypto) | Native browser API, hardware-accelerated, audited by browser vendors. No library needed |
| IndexedDB storage for config | Custom IndexedDB wrapper | Dexie.js | Already in project. Table can be extended with minimal diff |
| Image blob storage | Custom blob store | Existing Dexie.js + Blob pattern | Phase 1 established blob storage. Reuse `storeImage` callback pattern |

**Key insight:** This phase has a strong "don't build what exists" theme -- the Web Crypto API, Dexie.js, and lightweight tempura all provide what's needed without custom infrastructure.

## Common Pitfalls

### Pitfall 1: DALL-E 3 Seed Parameter Doesn't Actually Work
**What goes wrong:** The `seed` parameter is accepted by the API but ignored/overridden to a fixed value (often `5000`). Developers expect reproducibility but get different images each time.
**Why it happens:** DALL-E 3's image generation pipeline doesn't expose deterministic generation publicly. The seed parameter is listed in the API but doesn't produce deterministic results [CITED: OpenAI Developer Community discussions].
**How to avoid:** Do NOT rely on `seed` for reproducibility with DALL-E 3. Always log the `revised_prompt` (which DALL-E 3 auto-rewrites) to understand what was actually generated. The `seed` field in `AdapterResult` should be `null` for DALL-E 3.
**Warning signs:** User reports "same seed gives different images" -- this is expected DALL-E 3 behavior, not a bug.

### Pitfall 2: Stability.ai API Version Mismatch
**What goes wrong:** SDXL uses the legacy v1 API with `application/json` and engine_id in the URL (`/v1/generation/{engine_id}/text-to-image`). SD3/SD3.5 uses the v2beta API with `multipart/form-data` at `/v2beta/stable-image/generate/sd3`. Using JSON for SD3 fails; using form-data for SDXL fails.
**Why it happens:** Stability.ai maintains two parallel API versions with completely different wire formats.
**How to avoid:** The Stability adapter must dispatch based on the selected model: SDXL models use v1+JSON, SD3 models use v2beta+FormData. Each endpoint has its own configuration schema (SDXL requires `text_prompts[]`, SD3 requires `prompt` string).
**Warning signs:** 400/415 errors from Stability API when switching models.

### Pitfall 3: DALL-E 3 Revised Prompt Confusion
**What goes wrong:** Developers pass a prompt, but DALL-E 3 returns a `revised_prompt` that differs from the input. Users see images that don't match their prompt.
**Why it happens:** DALL-E 3 automatically enriches and safety-filters prompts through an internal LLM. The rewritten prompt is returned as `revised_prompt` [CITED: OpenAI API reference].
**How to avoid:** Always display `revised_prompt` alongside the generated image so users understand what DALL-E 3 actually generated. Save both the original prompt and `revised_prompt` in generation metadata.
**Warning signs:** User feedback: "The image doesn't look like my prompt." Check revised_prompt.

### Pitfall 4: API Key Leakage via Error Messages
**What goes wrong:** API error responses sometimes echo back the API key or include it in stack traces. If these errors are displayed to users, keys leak.
**Why it happens:** OpenAI/Stability error responses can be verbose, especially for auth failures (401 responses).
**How to avoid:** The `AiAdapter` error wrapping MUST strip sensitive information from error messages. Never display raw API error responses to users. Map auth errors to generic "Invalid API key" messages.
**Warning signs:** Error message contains "Bearer", "sk-", or partial API keys.

### Pitfall 5: OffscreenCanvas Browser Support
**What goes wrong:** MockAdapter uses OffscreenCanvas to generate images, but some browsers (older Safari) don't support it.
**Why it happens:** OffscreenCanvas is supported in Chrome 69+, Firefox 105+, Safari 16.4+. Most modern browsers are fine, but older Safari versions may fall back [CITED: MDN compatibility table].
**How to avoid:** Use feature detection: `typeof OffscreenCanvas !== 'undefined'` and fall back to regular Canvas API if unavailable. The fallback doesn't need Web Worker threading -- just create a hidden `<canvas>` element.
**Warning signs:** MockAdapter returns no image or throws in Safari < 16.4.

### Pitfall 6: Encryption Key Loss on App Update
**What goes wrong:** If the app-level encryption key is hardcoded and changes in a future deployment, all previously encrypted API keys become permanently undecryptable.
**Why it happens:** AES-GCM decryption fails if the key changes (ciphertext authentication tag mismatch).
**How to avoid:** Use a versioned key scheme: `key_v0_1`, `key_v0_2`. Store a `keyVersion` alongside the ciphertext. When decrypting, read the version, look up the right key. On key rotation, re-encrypt existing ciphertexts with the new key.
**Warning signs:** "Decryption failed" errors after app update -- user has to re-enter API keys.

## Code Examples

### DALL-E 3 API Call (direct fetch)
```typescript
// Source: OpenAI API Reference https://platform.openai.com/docs/api-reference/images/create
async function callDalle3(
  prompt: string,
  apiKey: string,
  options: { size?: string; quality?: string; style?: string } = {},
  baseUrl = 'https://api.openai.com',
): Promise<{ imageData: ArrayBuffer; revisedPrompt: string | null }> {
  const response = await fetch(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: options.size ?? '1024x1024',
      quality: options.quality ?? 'standard',
      style: options.style ?? 'vivid',
      response_format: 'b64_json', // permanent; URL expires in 60min
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.error?.message ?? `DALL-E 3 error: ${response.status}`)
  }

  const json = await response.json()
  const data = json.data[0]
  const binary = Uint8Array.from(atob(data.b64_json), (c) => c.charCodeAt(0))

  return {
    imageData: binary.buffer,
    revisedPrompt: data.revised_prompt ?? null,
  }
}
```

### Stability.ai SD3 Call (multipart/form-data)
```typescript
// Source: Stability.ai API Reference https://platform.stability.ai/docs/api-reference
async function callStabilitySD3(
  prompt: string,
  apiKey: string,
  options: {
    model?: string
    aspectRatio?: string
    seed?: number
    outputFormat?: string
    negativePrompt?: string
  } = {},
  baseUrl = 'https://api.stability.ai',
): Promise<{ imageData: ArrayBuffer; seed: number }> {
  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('model', options.model ?? 'sd3.5-large')
  formData.append('aspect_ratio', options.aspectRatio ?? '1:1')
  formData.append('output_format', options.outputFormat ?? 'png')
  if (options.seed !== undefined && options.seed > 0) {
    formData.append('seed', String(options.seed))
  }
  if (options.negativePrompt) {
    formData.append('negative_prompt', options.negativePrompt)
  }

  const response = await fetch(`${baseUrl}/v2beta/stable-image/generate/sd3`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.message ?? `Stability AI error: ${response.status}`)
  }

  // When Accept: application/json, response is JSON with base64 image
  const json = await response.json()
  const binary = Uint8Array.from(atob(json.image), (c) => c.charCodeAt(0))

  return {
    imageData: binary.buffer,
    seed: json.seed ?? 0,
  }
}
```

### MockAdapter Canvas Image Generation
```typescript
// Source: MDN OffscreenCanvas documentation [CITED]
function generateMockImage(
  prompt: string,
  width: number,
  height: number,
  seed: number,
): Promise<Blob> {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!

  // Deterministic color from prompt hash
  const hue = [...prompt].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  ctx.fillStyle = `hsl(${hue}, 60%, 70%)`
  ctx.fillRect(0, 0, width, height)

  // Text overlay
  ctx.fillStyle = '#333'
  ctx.font = `${Math.min(width, height) * 0.04}px sans-serif`
  ctx.fillText(prompt.slice(0, 60), 20, 40)
  ctx.fillText(`MockAdapter | seed: ${seed}`, 20, 80)
  ctx.fillText(`${width} x ${height}`, 20, 120)
  ctx.fillText('--- MOCK ---', 20, 160)

  return canvas.convertToBlob({ type: 'image/png' })
}
```

### Template Rendering with Tempura
```typescript
// Source: Tempura GitHub README https://github.com/lukeed/tempura
import { compile } from 'tempura'

const template = `
{{#if stylePreset !== 'none'}}
  Create a {{subject}} in {{stylePreset}} style
{{#else}}
  Create a {{subject}}
{{/if}}
, with dimensions {{width}}x{{height}}`

const render = compile(template)
const result = render({
  subject: 'beautiful landscape',
  stylePreset: 'oil-painting',
  width: 1024,
  height: 1024,
})
// "Create a beautiful landscape in oil-painting style, with dimensions 1024x1024"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OpenAI DALL-E 3 via SDK | Direct fetch() | Always available | ~80KB bundle savings, simpler error handling |
| Full Handlebars (82KB) | Tempura (1.3KB) | 2023 release | 98% size reduction, 7x faster rendering |
| localStorage for API keys | IndexedDB + Web Crypto | Browser-native | Encryption at rest, XSS-resistant |
| Stability v1 (JSON, engine_id) | Stability v2beta (FormData) | Late 2024 | Newer SD3 models only available on v2beta. Must support both for SDXL backward compatibility |

**Deprecated/outdated:**
- **Stable Diffusion 1.6:** Deprecated mid-2025. No longer needs adapter support.
- **DALL-E 2:** No longer available via API. DALL-E 3 is the minimum for OpenAI.
- **DALL-E 3 on Azure OpenAI:** Retired March 4, 2026. Direct OpenAI API still works.
- **gpt-image-1** (OpenAI's DALL-E 3 successor): Not yet required for MVP. If OpenAI deprecates DALL-E 3 during this project, the adapter can be updated to call gpt-image-1 endpoint with minimal changes.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DALL-E 3 API remains available via direct OpenAI API (not Azure) through Phase 4 implementation | OpenAI Adapter | MEDIUM: gpt-image-1 migration would need a new model ID and parameter adjustments, but adapter interface stays same |
| A2 | `seed` parameter for DALL-E 3 doesn't produce deterministic results | Pitfall 1 | LOW: Adapter already handles this by returning `null` seed for DALL-E 3 |
| A3 | OffscreenCanvas available in target browsers (Chrome 69+, Firefox 105+, Safari 16.4+) | MockAdapter | LOW: Fallback to regular Canvas works, just less performant |
| A4 | Web Crypto API PBKDF2 with 600K iterations runs acceptably on mobile devices | Encryption | MEDIUM: Add a loading state during key derivation. If too slow, reduce iterations to 310K (OWASP minimum) |
| A5 | Direct fetch() is simpler than OpenAI SDK for DALL-E 3 calls | SDK Decision | LOW: OpenAI SDK wraps the same API. If auth headers or retry logic become complex, switching to SDK is a single-file change |

## Open Questions

1. **Encryption approach: app-level key vs user passphrase?**
   - What we know: D-09 allows either. Web Crypto PBKDF2 implementation is the same either way.
   - What's unclear: User passphrase UX adds friction (user must remember/enter a password) but provides stronger security. App-level key is transparent but less secure.
   - Recommendation: Start with app-level key for MVP velocity. The encryption API is abstracted in `providerStore.ts` -- upgrading to passphrase later only changes `getEncryptionKey()`.

2. **Where does `storeImage` store blobs?**
   - What we know: Phase 1 planned blob storage (D-13) but no `BlobStore` service exists in the current codebase. ImageCacheManager handles ImageBitmap caching, not blob persistence.
   - What's unclear: Does the `storeImage` callback need to create a new blob storage table in IndexedDB? Or reuse the existing project record?
   - Recommendation: Planner should define a `BlobStore` service (or integrate into existing projectService) that stores blobs in IndexedDB. The `storeImage` callback delegates to this service.

3. **Stability.ai image-to-image: input image format?**
   - What we know: v2beta SD3 endpoint supports `mode=image-to-image` with `image` (binary) and `strength` (0-1) params.
   - What's unclear: The adapter receives images as `imageBlobId` strings (Phase 1 blob references). Need to load blob from IndexedDB before sending as FormData.
   - Recommendation: The adapter's `execute()` receives a helper function or reads from a global blob resolver to convert `imageBlobId` to `Blob`.

4. **Provider config: new Dexie table or field on projects?**
   - What we know: D-08 says planner decides. Provider configs are global (not per-project) in MVP.
   - What's unclear: Should config be scoped per-project or global? If per-project, a field on `ProjectRecord` works. If global, a new `providerConfig` table is cleaner.
   - Recommendation: New `providerConfig` table (global scope, separate from project data). Simpler CRUD, no serialization coupling, easy to make per-user later.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/dev server | Yes | v23.8.0 | -- (use v23, upgrade to v24 when convenient) |
| pnpm | Package management | Yes | 11.8.0 | -- |
| Dexie.js | IndexedDB layer | Yes (project dep) | ^4.4.4 | -- |
| Web Crypto API | Encryption | Yes (browser native) | -- | -- |
| OffscreenCanvas | MockAdapter | Yes (Chrome/Firefox/Safari 16.4+) | -- | Fallback to hidden <canvas> element |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** OffscreenCanvas on Safari < 16.4 -- use hidden `<canvas>` element.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x (already in project as devDependency) |
| Config file | `vitest.config.ts` at project root or package-level |
| Quick run command | `pnpm --filter @ac-canvas/ai-core vitest run` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | OpenAI DALL-E 3 adapter formats correct HTTP request | unit | `vitest run packages/ai-core/src/adapters/openai.adapter.test.ts` | No -- Wave 0 |
| AI-02 | Stability.ai adapter formats correct HTTP request | unit | `vitest run packages/ai-core/src/adapters/stability.adapter.test.ts` | No -- Wave 0 |
| AI-03 | MockAdapter returns valid PNG blob matching requested dimensions | unit | `vitest run packages/ai-core/src/adapters/mock.adapter.test.ts` | No -- Wave 0 |
| AI-05 | Provider config encrypts/decrypts API keys correctly | unit | `vitest run packages/ai-core/src/config/providerStore.test.ts` | No -- Wave 0 |
| AI-06 | Template engine substitutes variables and handles conditionals | unit | `vitest run packages/ai-core/src/prompt/templateEngine.test.ts` | No -- Wave 0 |
| AI-01..06 | All adapters implement AiAdapter interface correctly | unit | `vitest run packages/ai-core/src/adapters/base.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** Quick test for affected adapter: `vitest run packages/ai-core/src/adapters/{name}.test.ts`
- **Per wave merge:** Full ai-core suite: `vitest run packages/ai-core`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/ai-core/src/adapters/base.test.ts` -- shared adapter contract tests (AiAdapter interface compliance)
- [ ] `packages/ai-core/src/adapters/openai.adapter.test.ts` -- unit test with mocked fetch
- [ ] `packages/ai-core/src/adapters/stability.adapter.test.ts` -- unit test with mocked fetch
- [ ] `packages/ai-core/src/adapters/mock.adapter.test.ts` -- canvas rendering output verification
- [ ] `packages/ai-core/src/config/providerStore.test.ts` -- encrypt/decrypt round-trip, schema validation
- [ ] `packages/ai-core/src/prompt/templateEngine.test.ts` -- variable substitution, conditionals, path resolution
- [ ] `packages/ai-core/vitest.config.ts` -- package-level Vitest config
- [ ] `packages/ai-core/tsconfig.json` -- TypeScript config for the package

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | API key management via BYOK pattern, keys never stored in plaintext |
| V5 Input Validation | Yes | URL validation for custom baseUrl, prompt sanitization |
| V6 Cryptography | Yes | AES-256-GCM via Web Crypto API, PBKDF2 key derivation with 600K iterations |
| V8 Data Protection | Yes | Encrypted IndexedDB storage for API keys |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key leakage via error messages | Information Disclosure | Error wrapper strips sensitive data from messages, generic "Invalid API key" for auth failures |
| Key extraction via XSS | Tampering | CSP enforcement + encrypted storage (key never in localStorage) |
| Decryption failure on key rotation | Denial of Service | Versioned encryption keys, migrate records on key change |
| Prompt injection via node graph | Spoofing | Template engine escapes `{{variable}}` by default (D-11), screen prompt length to 4000 chars (OpenAI limit) |

## Sources

### Primary (HIGH confidence)
- OpenAI API Reference: https://platform.openai.com/docs/api-reference/images/create
- Stability.ai API Reference: https://platform.stability.ai/docs/api-reference
- Tempura GitHub: https://github.com/lukeed/tempura
- Dexie.js Docs: https://dexie.org/docs/
- MDN Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- MDN OffscreenCanvas: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas

### Secondary (MEDIUM confidence)
- OpenAI DALL-E 3 seed discussion: https://community.openai.com/t/dalle-3-on-api-seed-support/480047
- OWASP PBKDF2 recommendations: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- DALL-E 3 Azure retirement: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/dall-e-quickstart

### Tertiary (LOW confidence)
- Existing codebase patterns verified by reading: `apps/web/src/engine/types.ts`, `apps/web/src/engine/resolvers.ts`, `apps/web/src/stores/engineStore.ts`, `apps/web/src/stores/nodeGraphStore.ts`, `apps/web/src/stores/canvasStore.ts`, `apps/web/src/indexedb/db.ts`, `apps/web/src/indexedb/projectService.ts`, `apps/web/src/utils/ImageCacheManager.ts`, `packages/shared/src/types/nodeGraph.ts`, `packages/shared/src/types/canvas.ts`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified via npm registry, GitHub, and official docs
- Architecture: HIGH - Based on verified project patterns (Zustand+Immer stores, workspace packages, serialization patterns)
- Pitfalls: MEDIUM - DALL-E 3 seed behavior from community reports, OffscreenCanvas support from MDN. API key encryption patterns are standard Web Crypto

**Research date:** 2026-07-01
**Valid until:** 2026-08-01 (fast-moving AI API landscape)
