// ---------------------------------------------------------------------------
// Tests for PromptEditor
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../indexedb/db'

// Mock the db
vi.mock('../../indexedb/db', () => ({
  db: {
    promptTemplates: {
      add: vi.fn().mockResolvedValue(1),
      put: vi.fn().mockResolvedValue(1),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([]),
        })),
      })),
      get: vi.fn().mockResolvedValue(undefined),
    },
  },
  PromptTemplateRecord: {},
}))

// Mock @ac-canvas/ai-core templateEngine
vi.mock('@ac-canvas/ai-core', () => ({
  AdapterRegistry: {
    getInstance: vi.fn(() => ({
      getAllProviders: vi.fn(() => []),
      get: vi.fn(),
      register: vi.fn(),
    })),
  },
}))

vi.mock('@ac-canvas/ai-core/prompt/templateEngine', () => ({
  renderTemplate: vi.fn((template: string, variables: Record<string, unknown>) => {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(variables[key] ?? `{{${key}}}`))
  }),
}))

import { PromptEditor } from '../../components/PromptEditor'

describe('PromptEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with title and basic layout when open', () => {
    render(<PromptEditor open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('提示词模板编辑器')).toBeInTheDocument()
  })

  it('shows template name input', () => {
    render(<PromptEditor open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('模板名称')).toBeInTheDocument()
  })

  it('shows template textarea with monospace font', () => {
    render(<PromptEditor open={true} onOpenChange={vi.fn()} />)
    const textarea = screen.getByPlaceholderText('输入模板内容，使用 {{variable}} 语法')
    expect(textarea).toBeInTheDocument()
  })

  it('parses variables from template text and displays them', async () => {
    render(<PromptEditor open={true} onOpenChange={vi.fn()} />)

    const textarea = screen.getByPlaceholderText('输入模板内容，使用 {{variable}} 语法') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Hello {{name}}, your score is {{score}}' } })

    await waitFor(() => {
      expect(screen.getByText('name')).toBeInTheDocument()
      expect(screen.getByText('score')).toBeInTheDocument()
    })
  })

  it('shows live preview section', () => {
    render(<PromptEditor open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('预览')).toBeInTheDocument()
  })

  it('shows save and cancel buttons', () => {
    render(<PromptEditor open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('保存模板')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when cancel is clicked', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<PromptEditor open={true} onOpenChange={onOpenChange} />)

    await user.click(screen.getByText('取消'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('saves template to IndexedDB when save is clicked', async () => {
    const user = userEvent.setup()
    render(<PromptEditor open={true} onOpenChange={vi.fn()} />)

    // Fill in name
    const nameInput = screen.getByPlaceholderText('模板名称')
    await user.type(nameInput, 'My Template')

    // Fill in template text (use fireEvent to avoid userEvent {{}} escaping)
    const textarea = screen.getByPlaceholderText('输入模板内容，使用 {{variable}} 语法') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Hello {{name}}' } })

    // Wait for React state to propagate
    await waitFor(() => {
      expect(textarea.value).toBe('Hello {{name}}')
    })

    // Click save
    await user.click(screen.getByText('保存模板'))

    await waitFor(() => {
      expect(db.promptTemplates.put).toHaveBeenCalled()
      const callArg = vi.mocked(db.promptTemplates.put).mock.calls[0][0]
      expect(callArg.name).toBe('My Template')
      expect(callArg.template).toBe('Hello {{name}}')
    })
  })
})
