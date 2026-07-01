---
phase: 04-ai-adapters
plan: 04
type: execute
subsystem: ai-core
tags: [adapter, stability-ai, tdd, dual-api]
requires: [04-01]
provides: [StabilityAdapter]
affects: [05-bridge, node-engine]
tech-stack:
  added: []
  patterns: [FormData multipart POST, dual API version dispatch, aspect ratio computation, PNG header dimension parsing]
key-files:
  created:
    - packages/ai-core/src/adapters/stability.adapter.ts
    - packages/ai-core/src/adapters/stability.adapter.test.ts
  modified: []
decisions:
  - "Image-to-image: receives imageBlob directly in inputs (not via imageBlobId lookup) per resolved research question 3"
  - "Aspect ratio computed from width/height via GCD reduction with mapping to common ratios (1:1, 16:9, etc.)"
  - "Error sanitization strips sk- patterns using regex replace per Pitfall 4 mitigation"
  - "Content-Type header NOT set for FormData POST — browser sets it with multipart boundary automatically"
metrics:
  duration: 0.08h
  completed: "2026-07-01"
---

# Phase 04 Plan 04: Stability.ai Adapter Implementation

**One-liner:** Stability.ai adapter with dual v1/v2beta dispatch — SD3/SD3.5 uses FormData POST to `/v2beta/stable-image/generate/sd3`, SDXL uses JSON POST to `/v1/generation/{engine_id}/text-to-image` — plus image-to-image support, error sanitization, and full contract test coverage.

## Task Summary

| # | Name                   | Type | Commit | Status |
|---|------------------------|------|--------|--------|
| 1 | StabilityAdapter implementation | TDD (RED) | 7181533 | Done |
| 2 | StabilityAdapter tests | TDD (GREEN) | ffa2e81 | Done |

### Commits

- `7181533` — test(04-ai-adapters): add failing test for StabilityAdapter
- `ffa2e81` — feat(04-ai-adapters): implement StabilityAdapter with dual v1/v2beta API dispatch

## Implementation Details

### StabilityAdapter (`packages/ai-core/src/adapters/stability.adapter.ts`)

**Provider info:** `providerId='stability'`, `providerName='Stability AI'`, `defaultBaseUrl='https://api.stability.ai'`

**Constructor options:**
```typescript
interface StabilityAdapterOptions {
  apiKey?: string
  baseUrl?: string
}
```

**API version dispatch (Pitfall 2 mitigation):**
- **v2beta (SD3/SD3.5):** Models `sd3.5-large`, `sd3.5-medium`, `sd3-large`, `sd3-medium` -> FormData POST to `/v2beta/stable-image/generate/sd3`
- **v1 (SDXL):** Model `stable-diffusion-xl-1024-v1-0` -> JSON POST to `/v1/generation/{engine_id}/text-to-image`

**Key features:**
- FormData includes: prompt, model, aspect_ratio, output_format, optional seed/negative_prompt
- JSON body includes: text_prompts[], cfg_scale, height, width, samples, steps, optional seed/style_preset
- Image-to-image: detects `inputs.imageBlob` (Blob), appends to FormData with `mode=image-to-image` and `strength` (default 0.8)
- Aspect ratio computation: GCD reduction with mapping to common ratios
- Error handling: 401/403 -> auth_failed, 429 -> rate_limited, 400/415 -> invalid_params, other -> server_error
- Error sanitization: regex strips `sk-...` patterns from error messages (Pitfall 4)
- PNG dimension parsing: reads width/height from IHDR chunk binary data
- Progress events: 'sending_request' (10%), 'processing' (50%), 'storing_image' (70%), 'finalizing' (90%)

### Test Coverage (`packages/ai-core/src/adapters/stability.adapter.test.ts`)

| Area | Tests | Details |
|------|-------|---------|
| Contract tests | 6 | Shared adapter contract tests from base.test.ts |
| Static metadata | 3 | providerId, providerName, defaultBaseUrl |
| getModels() | 3 | Returns both v1 and v2beta models |
| getConfigSchema() | 2 | apiKey (password, required), baseUrl (text, optional) |
| testConnection() | 3 | GET /v1/user/account, 200 success, 401 failure |
| v2beta SD3 dispatch | 8 | FormData POST, prompt/model, aspect_ratio, seed, negative_prompt, seed from response, no Content-Type, default model |
| v1 SDXL dispatch | 7 | JSON POST, text_prompts, dimensions/params, seed > 0, seed 0 omitted, style_preset, seed from artifacts |
| Image-to-image | 2 | FormData with image/mode/strength, custom strength |
| Error handling | 5 | 401 auth_failed, 429 rate_limited, 400 invalid_params, sanitized messages, network error |
| Custom base URL | 1 | Proxy/mirror override |
| Event emission | 1 | Progress events emitted during execute |
| **Total** | **45** | |

### Models

| Model ID | Name | Sizes | Max Dims | Img2Img | Seed |
|----------|------|-------|----------|---------|------|
| `sd3.5-large` | Stable Diffusion 3.5 Large | 10 sizes | 2048x2048 | Yes | Yes |
| `sd3.5-medium` | Stable Diffusion 3.5 Medium | 3 sizes | 2048x2048 | Yes | Yes |
| `stable-diffusion-xl-1024-v1-0` | SDXL 1.0 | 1024x1024 | 1024x1024 | Yes | Yes |

## Verification

- [x] StabilityAdapter extends AiAdapter with all 4 mandatory methods
- [x] Dual API dispatch: SDXL -> v1 JSON, SD3 -> v2beta FormData
- [x] execute() correctly builds FormData for SD3 (not JSON) per Pitfall 2
- [x] execute() correctly builds JSON for SDXL with text_prompts[] and engine_id in URL
- [x] Image-to-image: receives image blob, sends as FormData with mode parameter
- [x] Returns seed from response (not null — Stability supports deterministic seeds)
- [x] Error messages sanitized — no API key leakage
- [x] Custom base URL supported for proxy/mirror
- [x] All 45 tests pass with mocked fetch (no real API key needed for suite)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

All created files verified:
- `packages/ai-core/src/adapters/stability.adapter.ts` -- FOUND
- `packages/ai-core/src/adapters/stability.adapter.test.ts` -- FOUND
- All 118 tests pass (full suite)
