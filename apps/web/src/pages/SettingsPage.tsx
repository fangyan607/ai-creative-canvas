// ---------------------------------------------------------------------------
// SettingsPage — Full settings page with AI Provider config, Theme, Export
// defaults, and Language sections.
//
// D-10: Full settings scope: AI Provider config, Theme, Export defaults,
// Language (placeholder).
// D-11: Dark mode with light/dark/system options.
// D-12: Settings page as a routed view at /settings.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdapterRegistry } from '@ac-canvas/ai-core'
import { getProviderStore, initProviderStore } from '@/stores/providerStoreSingleton'
import { useUIPreferencesStore, type Theme } from '@/stores/stubs/uiPreferencesStore'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProviderFormState {
  providerId: string
  providerName: string
  apiKey: string
  baseUrl: string
  selectedModel: string
  isEnabled: boolean
  showKey: boolean
}

// ---------------------------------------------------------------------------
// Apply theme helper — toggles .dark class on document.documentElement
// ---------------------------------------------------------------------------

function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsPage() {
  const navigate = useNavigate()
  const registry = AdapterRegistry.getInstance()
  const allProviders = registry.getAllProviders()

  const theme = useUIPreferencesStore((s) => s.theme)
  const setTheme = useUIPreferencesStore((s) => s.setTheme)
  const exportDefaults = useUIPreferencesStore((s) => s.exportDefaults)
  const setExportDefaults = useUIPreferencesStore((s) => s.setExportDefaults)

  const [providerForms, setProviderForms] = useState<ProviderFormState[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const loadedRef = useRef(false)

  // Load existing provider configs on mount
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    initProviderStore()
    const store = getProviderStore()
    store.listProviders().then(async (configuredIds: string[]) => {
      const forms: ProviderFormState[] = await Promise.all(
        allProviders.map(async (p) => {
          const config = configuredIds.includes(p.providerId)
            ? await store.loadConfig(p.providerId)
            : null

          return {
            providerId: p.providerId,
            providerName: p.providerName,
            apiKey: '',
            baseUrl: config?.baseUrl ?? '',
            selectedModel: config?.selectedModel ?? '',
            isEnabled: config?.isEnabled ?? false,
            showKey: false,
          }
        }),
      )
      setProviderForms(forms)
    })
  }, [allProviders])

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  // Update a specific field in a provider form
  const updateProviderForm = useCallback(
    (index: number, updates: Partial<ProviderFormState>) => {
      setProviderForms((prev) =>
        prev.map((f, i) => (i === index ? { ...f, ...updates } : f)),
      )
    },
    [],
  )

  // Save all settings
  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      const store = getProviderStore()
      for (const form of providerForms) {
        // Preserve existing API key when user leaves field empty
        let apiKey = form.apiKey
        if (!apiKey) {
          const existing = await store.loadConfig(form.providerId)
          // Keep existing key; if none exists, pass empty string (provider disabled or new)
          apiKey = existing?.apiKey ?? ''
        }
        await store.saveConfig({
          providerId: form.providerId,
          apiKey,
          baseUrl: form.baseUrl,
          selectedModel: form.selectedModel || undefined,
          isEnabled: form.isEnabled,
        })
      }
      setSaveMessage('设置已保存')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch {
      setSaveMessage('保存设置失败，请检查输入后重试')
    } finally {
      setSaving(false)
    }
  }, [providerForms])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            <span>返回画布</span>
          </button>
          <h1 className="text-[28px] font-semibold leading-tight text-foreground">
            设置
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理应用配置
          </p>
        </div>

        {/* Section 1: AI Provider Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AI 服务商配置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {providerForms.map((form, index) => (
                <div
                  key={form.providerId}
                  className="rounded-lg border border-border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{form.providerName}</span>
                    <Switch
                      checked={form.isEnabled}
                      onCheckedChange={(checked) =>
                        updateProviderForm(index, { isEnabled: checked })
                      }
                    />
                  </div>

                  {form.isEnabled && (
                    <div className="space-y-2.5 pl-0">
                      {/* API Key */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">API Key</Label>
                        <div className="relative">
                          <Input
                            type={form.showKey ? 'text' : 'password'}
                            value={form.apiKey}
                            onChange={(e) =>
                              updateProviderForm(index, { apiKey: e.target.value })
                            }
                            placeholder="输入 API Key"
                            className="pr-8"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateProviderForm(index, { showKey: !form.showKey })
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                          >
                            {form.showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Base URL */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Base URL</Label>
                        <Input
                          type="text"
                          value={form.baseUrl}
                          onChange={(e) =>
                            updateProviderForm(index, { baseUrl: e.target.value })
                          }
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>

                      {/* Default Model */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">默认模型</Label>
                        <Input
                          type="text"
                          value={form.selectedModel}
                          onChange={(e) =>
                            updateProviderForm(index, { selectedModel: e.target.value })
                          }
                          placeholder="例如 gpt-4o"
                        />
                      </div>

                      {/* Test Connection button (placeholder) */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSaveMessage('连接测试（功能开发中）')
                          setTimeout(() => setSaveMessage(null), 2000)
                        }}
                      >
                        测试连接
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Theme */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>主题</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {(
                [
                  { value: 'light', label: '浅色' },
                  { value: 'dark', label: '深色' },
                  { value: 'system', label: '跟随系统' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                    theme === option.value
                      ? 'border-ring bg-accent text-accent-foreground'
                      : 'border-border bg-transparent text-foreground hover:bg-muted',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Export Defaults */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>导出默认值</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {/* Default format */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">默认格式</Label>
                <Select
                  value={exportDefaults.format}
                  onValueChange={(val: string | null) => {
                    if (val) setExportDefaults({ format: val as 'png' | 'jpg' })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpg">JPG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Default scale/resolution */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">默认分辨率</Label>
                <Select
                  value={String(exportDefaults.scale)}
                  onValueChange={(val: string | null) => {
                    if (val) setExportDefaults({ scale: Number(val) as 1 | 2 | 3 })
                  }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                    <SelectItem value="3">3x</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Default background */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">默认背景</Label>
                <Select
                  value={exportDefaults.background}
                  onValueChange={(val: string | null) => {
                    if (val) setExportDefaults({ background: val as 'transparent' | 'white' })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transparent">透明</SelectItem>
                    <SelectItem value="white">白色</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Language (placeholder) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>语言</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm">中文（简体）</span>
              <span className="text-xs text-muted-foreground">更多语言即将推出</span>
            </div>
          </CardContent>
        </Card>

        {/* Save button + message */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存设置'}
          </Button>
          {saveMessage && (
            <span
              className={cn(
                'text-sm',
                saveMessage.includes('失败') ? 'text-destructive' : 'text-success',
              )}
            >
              {saveMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
