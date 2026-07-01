---
phase: 04-ai-adapters
reviewed: 2026-07-01T10:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - apps/web/src/indexedb/db.ts
  - package.json
  - packages/ai-core/package.json
  - packages/ai-core/src/adapters/base.test.ts
  - packages/ai-core/src/adapters/mock.adapter.test.ts
  - packages/ai-core/src/adapters/mock.adapter.ts
  - packages/ai-core/src/adapters/openai.adapter.test.ts
  - packages/ai-core/src/adapters/openai.adapter.ts
  - packages/ai-core/src/adapters/stability.adapter.test.ts
  - packages/ai-core/src/adapters/stability.adapter.ts
  - packages/ai-core/src/config/encryption.ts
  - packages/ai-core/src/config/providerStore.test.ts
  - packages/ai-core/src/config/providerStore.ts
  - packages/ai-core/src/index.ts
  - packages/ai-core/src/interfaces/AiAdapter.ts
  - packages/ai-core/src/interfaces/interfaces.test.ts
  - packages/ai-core/src/interfaces/types.ts
  - packages/ai-core/src/prompt/templateEngine.test.ts
  - packages/ai-core/src/prompt/templateEngine.ts
  - packages/ai-core/src/prompt/templates.ts
  - packages/ai-core/src/registry.test.ts
  - packages/ai-core/src/registry.ts
  - packages/ai-core/tsconfig.json
  - packages/ai-core/vitest.config.ts
  - pnpm-workspace.yaml
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-07-01T10:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Reviewed 22 source files for the AI adapter system (Phase 4). The codebase is well-structured, follows a consistent adapter pattern, has comprehensive test coverage, and properly handles edge cases like API error sanitization, canvas fallbacks, and encrypted storage. No critical bugs or security vulnerabilities were found.

Five warnings were identified: unvalidated API response type assertions in the Stability adapter, a design issue where `ProviderStore.loadConfig` decrypts the API key but discards the result (forcing a second expensive PBKDF2 round), the registry bypassing TypeScript constructor safety, inconsistent API key sanitization patterns across adapters, and the use of a static PBKDF2 salt. The info items cover test assertions that always pass, duplicated interface definitions, and minor code quality concerns.

All tests pass, the adapter contract is consistently enforced via `runAdapterContractTests`, and the architecture cleanly separates concerns across interfaces, adapters, config, and prompt modules.

---

## Warnings

### WR-01: StabilityAdapter response type assertions without validation

**File:** `packages/ai-core/src/adapters/stability.adapter.ts:302-310`

**Issue:** The v2beta and v1 API response parsing uses `as string` and `as number` type assertions to extract `image`, `seed`, `base64`, and `seed` from the response JSON. These assertions bypass TypeScript's type checking without any runtime validation of the response shape. If the Stability API returns an unexpected response structure (e.g., due to a breaking API change, network truncation, or a 200-level error with different JSON shape), the code would pass `undefined` to `base64ToBytes()`, producing a confusing error rather than a clear `AiAdapterError`.

```typescript
// v2beta path - lines 303-304
imageBase64 = responseData.image as string  // undefined if key missing
responseSeed = responseData.seed as number  // undefined if key missing

// v1 path - lines 307-309
const artifact = (responseData.artifacts as Array<Record<string, unknown>>)?.[0]
imageBase64 = artifact?.base64 as string  // undefined if artifacts missing
```

**Fix:** Add runtime validation before type assertions. At minimum, guard with an explicit check:

```typescript
if (isV2beta) {
  if (typeof responseData.image !== 'string') {
    throw new AiAdapterError('server_error', 'Stability API response missing image data')
  }
  imageBase64 = responseData.image
  responseSeed = typeof responseData.seed === 'number' ? responseData.seed : 0
} else {
  const artifact = (responseData.artifacts as Array<Record<string, unknown>>)?.[0]
  if (!artifact || typeof artifact.base64 !== 'string') {
    throw new AiAdapterError('server_error', 'Stability API response missing artifact data')
  }
  imageBase64 = artifact.base64 as string
  responseSeed = typeof artifact.seed === 'number' ? (artifact.seed as number) : 0
}
```

---

### WR-02: ProviderStore.loadConfig decrypts API key but discards the value

**File:** `packages/ai-core/src/config/providerStore.ts:92-124`

**Issue:** The `loadConfig` method calls `decryptApiKey()` on line 96-99 but the decrypted result is discarded. The returned `ProviderConfig` object (lines 101-110) only contains `encryptedApiKey` (the ciphertext), not the decrypted key. This means:
1. Any caller needing both the config and the API key must call `loadConfig` + `getApiKey` separately.
2. Each call to `decryptApiKey` triggers `deriveEncryptionKey()` which runs 600,000 PBKDF2 iterations. Two calls = 1.2 million iterations for a single request.
3. The `loadConfig` decryption call serves only as a "can we still decrypt?" health check.

```typescript
try {
  await decryptApiKey(record.encryptedApiKey, record.encryptionIv, record.keyVersion)
  // ^ result discarded
  return {
    providerId: record.providerId,
    encryptedApiKey: record.encryptedApiKey,  // still encrypted, not the decrypted value
    // ... no decrypted key field in ProviderConfig type
  }
```

**Fix:** Either (a) add a `decryptedApiKey?: string` field to the `ProviderConfig` interface and include the decrypted value in the return, or (b) remove the decryption call from `loadConfig` entirely and make callers use `getApiKey` for the key. Option (a) is preferred to avoid the double-PBKDF2 cost:

```typescript
// In types.ts
export interface ProviderConfig {
  providerId: string
  encryptedApiKey: string
  decryptedApiKey?: string  // added for convenience, not persisted
  encryptionIv: string
  keyVersion: string
  // ...
}

// In providerStore.ts loadConfig
const decryptedApiKey = await decryptApiKey(...)
return {
  ...record,
  decryptedApiKey,  // include decrypted value
  isEnabled: true,
}
```

---

### WR-03: Registry bypasses constructor type safety with `as any` cast

**File:** `packages/ai-core/src/registry.ts:25`

**Issue:** The `register()` method creates a temporary adapter instance via `new (adapterClass as any)()`. The `as any` cast completely bypasses TypeScript's constructor signature checking. While all current adapters (`MockAdapter`, `OpenAiAdapter`, `StabilityAdapter`) accept an optional options argument, the registry's `AdapterConstructor` type is `new (...args: unknown[]) => AiAdapter`, which doesn't match the actual constructors (they take `OpenAiAdapterOptions?` or `StabilityAdapterOptions?`). The `as any` cast papers over this type mismatch.

```typescript
type AdapterConstructor = new (...args: unknown[]) => AiAdapter
// ...
const instance = new (adapterClass as any)() as AiAdapter  // type safety lost
```

**Fix:** Define a factory interface that adapters implement instead of relying on constructor instantiation:

```typescript
interface AdapterFactory {
  readonly providerId: string
  create(options?: Record<string, unknown>): AiAdapter
}

// Or alternatively, require a parameterless constructor:
type AdapterConstructor = { new(): AiAdapter }
```

---

### WR-04: Inconsistent API key sanitization patterns across adapters

**Files:** `packages/ai-core/src/adapters/openai.adapter.ts:48-50` and `packages/ai-core/src/adapters/stability.adapter.ts:92-94`

**Issue:** Two separate sanitization functions with different regex patterns and replacement strings:

- **OpenAI** (`sanitizeErrorMessage`): `/sk-[A-Za-z0-9]{20,}/g` -- matches only keys 20+ alphanumeric chars, replaces with `sk-***`
- **Stability** (`sanitizeError`): `/sk-[a-zA-Z0-9-]+/g` -- matches any length including hyphens, replaces with `[REDACTED]`

The OpenAI pattern would miss Stability keys that contain hyphens (e.g., `sk-test-key-12345`). The Stability pattern is more permissive and would match more content, potentially over-redacting. The different replacement strings (`sk-***` vs `[REDACTED]`) mean error messages look different depending on which adapter produced them, confusing for users.

**Fix:** Extract a single shared sanitization function and use it from both adapters. For example, add it to a shared utility module:

```typescript
// packages/ai-core/src/utils/sanitize.ts
const API_KEY_PATTERN = /sk-[A-Za-z0-9-]{10,}/g

/**
 * Strip potential API key patterns from error messages.
 * Mitigates Pitfall 4 (key leakage via error surfaces).
 */
export function sanitizeErrorMessage(message: string): string {
  return message.replace(API_KEY_PATTERN, '[REDACTED]')
}
```

---

### WR-05: Static PBKDF2 salt and hardcoded app key secret

**File:** `packages/ai-core/src/config/encryption.ts:19,27`

**Issue:** The encryption key is derived from a hardcoded app-level string (`APP_KEY_BASE = 'ac-canvas-ai-core-encryption-v0.1'`) combined with a static salt (`SALT = TextEncoder.encode('ai-canvas-provider-key-salt')`). Both values are burned into the source code. Since this is an open-source project, anyone with repository access can derive the encryption key, meaning the "encryption at rest" in IndexedDB provides confidentiality only against casual disk access, not against a motivated attacker with source access.

The file documents this as an MVP trade-off (D-09), and the constraint is acceptable for a single-user client-side app. However, it should be explicitly called out as a known limitation.

**Fix:** For MVP, add inline documentation making the limitation explicit. For v1, plan to implement per-user passphrase-based key derivation:

```typescript
// KNOWN LIMITATION: The app key and salt are hardcoded in source, meaning
// anyone with repository access can derive the encryption key. This is
// acceptable for MVP single-user client-side storage (D-09).
// Upgrade path: Replace APP_KEY_BASE with user passphrase and SALT with
// per-user salt (e.g., derived from user identity) when adding auth.
```

---

## Info

### IN-01: Trivially-true progress event assertions

**Files:** `packages/ai-core/src/interfaces/interfaces.test.ts:280`, `packages/ai-core/src/adapters/base.test.ts:85`

**Issue:** Both files contain the assertion `expect(events.length).toBeGreaterThanOrEqual(0)`. An array's length is always >= 0 in JavaScript, so this assertion never fails and provides no test value. It was likely intended to verify that progress events were actually emitted during execution.

```typescript
// Always passes - provides zero value
expect(events.length).toBeGreaterThanOrEqual(0)
```

**Fix:** Remove the assertion or replace it with a specific check:

```typescript
// Check that the done event was emitted (via last event)
expect(events.filter(e => e.stage === 'done').length).toBeGreaterThanOrEqual(1)
// Or simply verify at least one event was emitted
expect(events.length).toBeGreaterThan(0)
```

---

### IN-02: Duplicated ProviderConfigRecord interface

**Files:** `apps/web/src/indexedb/db.ts:14-23`, `packages/ai-core/src/config/providerStore.ts:27-35`

**Issue:** Two identical `ProviderConfigRecord` interfaces are defined independently. One in the Dexie schema definition (`db.ts`) and one in the provider store's storage interface (`providerStore.ts`). If fields are added or changed in one without updating the other, they will silently diverge, potentially causing runtime mismatches between the storage schema and the application logic.

**Fix:** Define the shared type once in `packages/ai-core/src/interfaces/types.ts` and import it in both locations:

```typescript
// In packages/ai-core/src/interfaces/types.ts
export interface ProviderConfigRecord {
  providerId: string
  encryptedApiKey: string
  encryptionIv: string
  keyVersion: string
  baseUrl: string
  selectedModel?: string
  isEnabled: boolean
  updatedAt: number
}

// In db.ts — re-export or import from @ac-canvas/ai-core
export type { ProviderConfigRecord } from '@ac-canvas/ai-core'
```

---

### IN-03: extractVariableNames includes non-tempura keywords in skip list

**File:** `packages/ai-core/src/prompt/templateEngine.ts:49`

**Issue:** The skip list in `extractVariableNames` includes `'var'` and `'expect'`, which are not tempura block keywords. If a template uses `{{var}}` or `{{expect}}` as variable names, they will be excluded from the `props` array, causing tempura to throw at render time because it cannot resolve the reference.

```typescript
if (!['if', 'each', 'else', 'elif', 'as', 'var', 'expect'].includes(name)) {
  names.add(name)
}
```

Current templates don't use these variable names, so this is not an active bug, but it's a latent defect that could surface when new templates are added.

**Fix:** Remove the non-tempura keywords from the skip list:

```typescript
if (!['if', 'each', 'else', 'elif', 'as'].includes(name)) {
  names.add(name)
}
```

---

### IN-04: Loose type coercion in parameter extraction across adapters

**Files:** 
- `packages/ai-core/src/adapters/mock.adapter.ts:364-367`
- `packages/ai-core/src/adapters/openai.adapter.ts:99-103`
- `packages/ai-core/src/adapters/stability.adapter.ts:195-202`

**Issue:** All three adapters use the same pattern of `Number(nodeData.width) || DEFAULT_WIDTH` and `String(nodeData.prompt ?? '')` to extract parameters from the untyped `nodeData: Record<string, unknown>`. If `nodeData.width` is set to a non-numeric string like `"abc"`, `Number("abc")` returns `NaN`, and `NaN || DEFAULT_WIDTH` silently falls back to the default. This means invalid user input is silently ignored rather than surfaced as an error.

The pattern is intentional as a defensive measure, but it makes debugging type mismatches difficult.

**Fix:** While the current pattern is acceptable for MVP, consider adding validation in Phase 5 when the bridge layer connects node data to adapters. A Zod schema would provide clear error messages:

```typescript
import { z } from 'zod'

const ExecutionParams = z.object({
  prompt: z.string(),
  width: z.coerce.number().positive().default(1024),
  height: z.coerce.number().positive().default(1024),
  seed: z.coerce.number().int().optional(),
  // ...
})
```

---

### IN-05: Stale file reference in comments

**File:** `packages/ai-core/src/config/encryption.ts:11`

**Issue:** Line 11 references "RESEARCH.md Pattern 2" which is a migration research document that may not ship with the package. Same pattern in `mock.adapter.ts:88` referencing "04-RESEARCH.md". These references are useful during development but become stale doc links when the research docs are not present in the published artifact.

**Fix:** Either ensure RESEARCH.md is included in the package or replace the references with inline explanations of Pitfall 6 (key rotation) and Pitfall 5 (OffscreenCanvas fallback).

---

## Files Not Reviewed (Excluded)

The following files were explicitly listed but excluded as non-source (documentation or lock files): none — all listed files were reviewed.

---

_Reviewed: 2026-07-01T10:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
