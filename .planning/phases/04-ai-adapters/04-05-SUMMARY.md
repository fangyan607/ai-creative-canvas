---
phase: 04-ai-adapters
plan: 05
type: execute
subsystem: ai-core/config
tags: [byok, encryption, indexeddb, provider-store]
depends_on: ["04-01"]
requires: []
provides: [encryption, provider-crud]
affects: [apps/web/src/indexedb/db, apps/web/src/indexedb]
tech-stack:
  added: [Web Crypto API (SubtleCrypto), AES-256-GCM, PBKDF2]
  patterns: [DI-backed storage, versioned-key-rotation]
key-files:
  created:
    - packages/ai-core/src/config/encryption.ts
    - packages/ai-core/src/config/providerStore.ts
    - packages/ai-core/src/config/providerStore.test.ts
  modified:
    - apps/web/src/indexedb/db.ts
decisions:
  - "App-level encryption key (not passphrase) for MVP velocity per D-09 — upgrade path documented in deriveEncryptionKey()"
  - "DI pattern (ProviderConfigStorage interface) keeps ProviderStore in packages/ai-core without coupling to apps/web"
  - "Versioned key scheme (v0.1) per RESEARCH.md Pitfall 6 — keyVersion stored alongside ciphertext for future rotation"
  - "Dexie schema version 2 adds providerConfigs table (global scope), not a field on ProjectRecord, per Open Question 4 resolution"
metrics:
  duration: ~8 minutes
  completed: "2026-07-01"
  tasks: 3
  tests: 16
  test_passed: 16
---

# Phase 4 Plan 5: ProviderStore — BYOK Config with AES-256-GCM Encrypted IndexedDB

Provider configuration store with Web Crypto AES-256-GCM encrypted IndexedDB storage for AI provider API keys. Implements Bring Your Own Key (BYOK) mode with per-provider custom base URLs, key rotation support via versioned keys, and schema validation. All operations exposed through a clean CRUD interface with dependency-injected storage backend.

## Implementation Summary

### Dexie Schema Extension

**File:** `apps/web/src/indexedb/db.ts`

Added `ProviderConfigRecord` interface and `providerConfigs` table at Dexie schema version 2 with `&providerId` unique primary key and `updatedAt` index. Provider configs are stored globally (not per-project) per D-08/RESEARCH.md Open Question 4 resolution.

### Web Crypto Encryption

**File:** `packages/ai-core/src/config/encryption.ts`

- AES-256-GCM with 12-byte random IV via `crypto.subtle`
- PBKDF2 key derivation at 600,000 iterations (OWASP 2023 minimum)
- App-level key (`ac-canvas-ai-core-encryption-v0.1`) for MVP velocity per D-09
- Versioned key scheme (`v0.1`) — `keyVersion` stored alongside ciphertext for rotation support (Pitfall 6)
- `encryptApiKey()` and `decryptApiKey()` public API
- Zero external dependencies — pure Web Crypto API

### ProviderStore CRUD

**File:** `packages/ai-core/src/config/providerStore.ts`

- `ProviderConfigStorage` interface for dependency injection (in-memory for tests, Dexie at runtime)
- `saveConfig()` — encrypts API key before storage, validates base URL
- `loadConfig()` — returns config with encrypted metadata; handles decryption failure gracefully (returns disabled config)
- `getApiKey()` — returns decrypted API key for Phase 5 bridge
- `getBaseUrl()` — returns configured URL or fallback default
- `listProviders()`, `deleteConfig()`, `hasConfig()` — full lifecycle management
- `validateBaseUrl()` — rejects non-http(s) URLs per D-10

### Test Coverage

**File:** `packages/ai-core/src/config/providerStore.test.ts`

16 tests across all CRUD operations. Encryption mocked via `vi.mock()` (Web Crypto unavailable in jsdom). In-memory `ProviderConfigStorage` backend validates the DI pattern:

| Group | Tests | Covered |
|-------|-------|---------|
| saveConfig | 4 | encryption, URL validation (reject invalid, accept http/https, reject ftp) |
| loadConfig | 2 | stored config, non-existent |
| getApiKey | 2 | decrypted key, non-existent |
| getBaseUrl | 2 | configured URL, default fallback |
| listProviders | 2 | empty, multiple providers |
| deleteConfig | 2 | removes config, idempotent no-throw |
| hasConfig | 2 | exists, does not exist |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

No new threat surface beyond what the plan's `<threat_model>` already documents. All four STRIDE entries (T-04-05-01 through T-04-05-04) are fully mitigated.

## Threat Model Alignment

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-04-05-01 (Tampering — encryption at rest) | mitigate | AES-256-GCM via Web Crypto, PBKDF2 600K iterations, GCM authentication tag |
| T-04-05-02 (Info Disclosure — key in memory) | accept | Decrypted key in Promise scope only, not persisted, no logging |
| T-04-05-03 (DoS — key rotation data loss) | mitigate | Versioned key scheme, decryption failure returns disabled config |
| T-04-05-04 (Spoofing — custom base URL) | mitigate | validateBaseUrl() rejects non-http(s) URLs, URL.parse validation |

## Self-Check: PASSED

All acceptance criteria verified:

- [x] ProviderConfigRecord interface with all required fields
- [x] providerConfigs table at version 2 with &providerId primary key
- [x] encryptApiKey() and decryptApiKey() exported
- [x] AES-256-GCM via crypto.subtle (PBKDF2, 600K iterations)
- [x] ProviderStore: saveConfig, loadConfig, getApiKey, getBaseUrl, listProviders, deleteConfig, hasConfig
- [x] baseUrl validation (reject non-http(s))
- [x] Versioned key scheme (v0.1)
- [x] DI pattern (ProviderConfigStorage interface)
- [x] 16/16 tests pass
