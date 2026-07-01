// ---------------------------------------------------------------------------
// OpenAiAdapter Unit Tests
// ---------------------------------------------------------------------------
// Tests the full DALL-E 3 adapter lifecycle using mocked global fetch().
// No real API calls are made — all responses are simulated.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { OpenAiAdapter } from "./openai.adapter"
import { runAdapterContractTests } from "./base.test"
import { AiAdapterError } from "../interfaces/types"

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const MOCK_API_KEY = "sk-test-key-not-real"

/**
 * Create a minimal valid 1x1 pixel PNG as base64 for mock responses.
 */
const MINIMAL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

/**
 * Build a mock DALL-E 3 API response body.
 */
function createMockB64JsonResponse(
  b64Data?: string,
  revisedPrompt?: string | null
): Record<string, unknown> {
  return {
    created: 1686582093,
    data: [
      {
        b64_json: b64Data ?? MINIMAL_PNG_BASE64,
        revised_prompt: revisedPrompt ?? null,
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("OpenAiAdapter", () => {
  let adapter: OpenAiAdapter
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    // Default mock: successful response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(createMockB64JsonResponse()),
    })
    adapter = new OpenAiAdapter({ apiKey: MOCK_API_KEY })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // Shared contract tests (from base.test.ts)
  // -------------------------------------------------------------------------
  runAdapterContractTests(new OpenAiAdapter({ apiKey: MOCK_API_KEY }))

  // -------------------------------------------------------------------------
  // Static metadata
  // -------------------------------------------------------------------------

  describe("static metadata", () => {
    it('providerId is "openai"', () => {
      expect(adapter.providerId).toBe("openai")
    })

    it('providerName is "OpenAI"', () => {
      expect(adapter.providerName).toBe("OpenAI")
    })

    it('defaultBaseUrl is "https://api.openai.com"', () => {
      expect(adapter.defaultBaseUrl).toBe("https://api.openai.com")
    })
  })

  // -------------------------------------------------------------------------
  // getModels()
  // -------------------------------------------------------------------------

  describe("getModels()", () => {
    it("returns at least 1 model", () => {
      expect(adapter.getModels().length).toBeGreaterThanOrEqual(1)
    })

    it("returns dall-e-3 with correct supportedSizes", () => {
      const models = adapter.getModels()
      const dalle3 = models.find((m) => m.id === "dall-e-3")
      expect(dalle3).toBeDefined()
      expect(dalle3!.supportedSizes).toEqual([
        "1024x1024",
        "1024x1792",
        "1792x1024",
      ])
    })

    it("dall-e-3 has supportsSeed: false", () => {
      const models = adapter.getModels()
      const dalle3 = models.find((m) => m.id === "dall-e-3")
      expect(dalle3).toBeDefined()
      expect(dalle3!.supportsSeed).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // getConfigSchema()
  // -------------------------------------------------------------------------

  describe("getConfigSchema()", () => {
    it("returns ConfigField[]", () => {
      const schema = adapter.getConfigSchema()
      expect(Array.isArray(schema)).toBe(true)
    })

    it("apiKey field is password type and required", () => {
      const schema = adapter.getConfigSchema()
      const apiKeyField = schema.find((f) => f.key === "apiKey")
      expect(apiKeyField).toBeDefined()
      expect(apiKeyField!.type).toBe("password")
      expect(apiKeyField!.required).toBe(true)
    })

    it("baseUrl field is text type and optional with default", () => {
      const schema = adapter.getConfigSchema()
      const baseUrlField = schema.find((f) => f.key === "baseUrl")
      expect(baseUrlField).toBeDefined()
      expect(baseUrlField!.type).toBe("text")
      expect(baseUrlField!.required).toBe(false)
      expect(baseUrlField!.defaultValue).toBe("https://api.openai.com")
    })
  })

  // -------------------------------------------------------------------------
  // testConnection()
  // -------------------------------------------------------------------------

  describe("testConnection()", () => {
    it("calls fetch to /v1/models with Authorization header", async () => {
      await adapter.testConnection()
      expect(global.fetch).toHaveBeenCalledTimes(1)
      const callUrl = (global.fetch as any).mock.calls[0][0]
      const callHeaders = (global.fetch as any).mock.calls[0][1].headers
      expect(callUrl).toContain("/v1/models")
      expect(callHeaders.Authorization).toBe("Bearer " + MOCK_API_KEY)
    })

    it("returns success on 200", async () => {
      const result = await adapter.testConnection()
      expect(result.success).toBe(true)
      expect(result.message).toContain("successful")
    })

    it('returns failure with message containing "API key" on 401', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ error: { message: "Incorrect API key provided" } }),
      })
      const result = await adapter.testConnection()
      expect(result.success).toBe(false)
      expect(result.message).toContain("API key")
    })

    it("returns failure with status text on other errors", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: { message: "Server error" } }),
      })
      const result = await adapter.testConnection()
      expect(result.success).toBe(false)
      expect(result.message).toContain("Internal Server Error")
    })

    it("returns failure on network error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"))
      const result = await adapter.testConnection()
      expect(result.success).toBe(false)
      expect(result.message).toContain("Network error")
    })
  })

  // -------------------------------------------------------------------------
  // execute()
  // -------------------------------------------------------------------------

  describe("execute()", () => {
    it("sends POST to /v1/images/generations with correct JSON body", async () => {
      await adapter.execute(
        { prompt: "A cat", width: 1024, height: 1024 },
        {},
      )
      expect(global.fetch).toHaveBeenCalledTimes(1)
      const callUrl = (global.fetch as any).mock.calls[0][0]
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(callUrl).toContain("/v1/images/generations")
      expect(callBody.model).toBe("dall-e-3")
      expect(callBody.prompt).toBe("A cat")
      expect(callBody.size).toBe("1024x1024")
      expect(callBody.n).toBe(1)
      expect(callBody.response_format).toBe("b64_json")
      expect(callBody.quality).toBe("standard")
      expect(callBody.style).toBe("vivid")
    })

    it("includes Authorization: Bearer header from config", async () => {
      await adapter.execute({ prompt: "test" }, {})
      const headers = (global.fetch as any).mock.calls[0][1].headers
      expect(headers.Authorization).toBe("Bearer " + MOCK_API_KEY)
    })

    it("parses b64_json response and calls onStoreImage", async () => {
      const storeImage = vi.fn().mockResolvedValue("stored-img-1")
      await adapter.execute({ prompt: "test" }, {}, storeImage)
      expect(storeImage).toHaveBeenCalledTimes(1)
      expect(storeImage).toHaveBeenCalledWith(expect.any(Blob))
    })

    it("returns seed=null for DALL-E 3", async () => {
      const result = await adapter.execute({ prompt: "test" }, {})
      expect(result.seed).toBeNull()
    })

    it("records revised_prompt from response as metadata", async () => {
      // Override default mock to include a revised_prompt
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve(
            createMockB64JsonResponse(undefined, "A more detailed version of the prompt"),
          ),
      })
      // Check that revised_prompt is stored on nodeData
      const nodeData: Record<string, unknown> = { prompt: "test" }
      await adapter.execute(nodeData, {})
      expect(nodeData.revised_prompt).toBeDefined()
    })

    it("emits progress events during execute", async () => {
      const events: Array<{ percent: number; stage: string }> = []
      adapter.on("progress", (e) => events.push(e))
      await adapter.execute({ prompt: "test" }, {})
      expect(events.length).toBeGreaterThan(0)
    })

    it("returns correct model and timing", async () => {
      const result = await adapter.execute({ prompt: "test" }, {})
      expect(result.model).toBe("dall-e-3")
      expect(result.timing).toBeGreaterThanOrEqual(0)
    })

    it("uses default width=1024 and height=1024 when not specified", async () => {
      const result = await adapter.execute({ prompt: "test" }, {})
      expect(result.width).toBe(1024)
      expect(result.height).toBe(1024)
    })

    it("returns imageBlobId from onStoreImage callback", async () => {
      const storeImage = vi.fn().mockResolvedValue("custom-blob-id")
      const result = await adapter.execute({ prompt: "test" }, {}, storeImage)
      expect(result.imageBlobId).toBe("custom-blob-id")
    })

    it("generates fallback imageBlobId when onStoreImage is not provided", async () => {
      const result = await adapter.execute({ prompt: "test" }, {})
      expect(result.imageBlobId).toBeTruthy()
      expect(typeof result.imageBlobId).toBe("string")
    })

    it("emits done event with AdapterResult", async () => {
      let doneEvent: any = null
      adapter.on("done", (e) => { doneEvent = e })
      const result = await adapter.execute({ prompt: "test" }, {})
      expect(doneEvent).not.toBeNull()
      expect(doneEvent!.imageBlobId).toBe(result.imageBlobId)
    })
  })

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe("error handling", () => {
    it("throws AiAdapterError with code auth_failed on 401", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            error: { message: "Incorrect API key provided: sk-abc123xyz" },
          }),
      })
      await expect(
        adapter.execute({ prompt: "test" }, {}),
      ).rejects.toThrow(AiAdapterError)
      await expect(
        adapter.execute({ prompt: "test" }, {}),
      ).rejects.toHaveProperty("code", "auth_failed")
    })

    it("throws AiAdapterError with code rate_limited on 429", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: () =>
          Promise.resolve({
            error: { message: "Rate limit exceeded. Please wait." },
          }),
      })
      await expect(
        adapter.execute({ prompt: "test" }, {}),
      ).rejects.toHaveProperty("code", "rate_limited")
    })

    it("sanitizes error messages - no raw API keys in output", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: { message: "Incorrect API key provided: sk-abc123xyz" },
          }),
      })
      try {
        await adapter.execute({ prompt: "test" }, {})
        // Should not reach here
        expect(true).toBe(false)
      } catch (e: any) {
        // The message should NOT contain raw key data
        expect(e.message).not.toContain("sk-abc123xyz")
        expect(e.message).not.toContain("sk-")
      }
    })

    it("throws AiAdapterError on generic server error (500)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () =>
          Promise.resolve({
            error: { message: "Internal server error occurred" },
          }),
      })
      await expect(
        adapter.execute({ prompt: "test" }, {}),
      ).rejects.toThrow(AiAdapterError)
      await expect(
        adapter.execute({ prompt: "test" }, {}),
      ).rejects.toHaveProperty("code", "server_error")
    })

    it("throws AiAdapterError with invalid_params on 400", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () =>
          Promise.resolve({
            error: { message: "Invalid prompt or size parameter" },
          }),
      })
      await expect(
        adapter.execute({ prompt: "" }, {}),
      ).rejects.toHaveProperty("code", "invalid_params")
    })

    it("throws AiAdapterError on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"))
      await expect(
        adapter.execute({ prompt: "test" }, {}),
      ).rejects.toThrow(AiAdapterError)
      await expect(
        adapter.execute({ prompt: "test" }, {}),
      ).rejects.toHaveProperty("code", "server_error")
    })
  })

  // -------------------------------------------------------------------------
  // Custom base URL (D-10 proxy/mirror support)
  // -------------------------------------------------------------------------

  describe("custom base URL", () => {
    it("uses custom baseUrl when provided in constructor", async () => {
      const customAdapter = new OpenAiAdapter({
        apiKey: MOCK_API_KEY,
        baseUrl: "https://openai-proxy.example.com",
      })
      await customAdapter.execute({ prompt: "test" }, {})
      const callUrl = (global.fetch as any).mock.calls[0][0]
      expect(callUrl).toContain("openai-proxy.example.com")
      expect(callUrl).toContain("/v1/images/generations")
    })

    it("defaults to api.openai.com when no baseUrl provided", async () => {
      await adapter.execute({ prompt: "test" }, {})
      const callUrl = (global.fetch as any).mock.calls[0][0]
      expect(callUrl).toContain("api.openai.com")
    })
  })
})