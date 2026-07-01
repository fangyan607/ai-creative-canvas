// ---------------------------------------------------------------------------
// TabbedSidebar — Left unified panel with tab switching.
//
// D-03: Consolidates Layers/Assets/Properties into a single left-side panel
// with tab navigation.
// D-04: Fixed width (288px expanded, 44px icon-only), collapsible via toggle.
//
// Both expanded and collapsed states remain in the DOM — visibility is toggled
// via CSS to avoid remounting tab content (anti-pattern from RESEARCH.md).
// ---------------------------------------------------------------------------

import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  Layers,
  PanelRightOpen,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useUIPreferencesStore, type SidebarTab } from '../stores/stubs/uiPreferencesStore'
import { LayerListContent } from './LayerPanel'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

interface TabDefinition {
  id: SidebarTab
  label: string
  icon: typeof Layers
}

const TABS: TabDefinition[] = [
  { id: 'layers', label: '图层', icon: Layers },
  { id: 'assets', label: '素材', icon: PanelRightOpen },
  { id: 'properties', label: '属性', icon: Pencil },
]

// ---------------------------------------------------------------------------
// Tab content (placeholder for Assets and Properties; Layers uses LayerListContent)
// ---------------------------------------------------------------------------

function TabContent({ tab }: { tab: SidebarTab }) {
  switch (tab) {
    case 'layers':
      return (
        <div className="flex-1 overflow-hidden">
          <LayerListContent />
        </div>
      )
    case 'assets':
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
          暂无素材
        </div>
      )
    case 'properties':
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
          选择节点以编辑属性
        </div>
      )
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TabbedSidebar() {
  const sidebarCollapsed = useUIPreferencesStore(
    useShallow((s) => s.sidebarCollapsed),
  )
  const activeTab = useUIPreferencesStore(
    useShallow((s) => s.activeTab),
  )
  const toggleSidebar = useUIPreferencesStore((s) => s.toggleSidebar)
  const setActiveTab = useUIPreferencesStore((s) => s.setActiveTab)

  const handleTabClick = useCallback(
    (tab: SidebarTab) => {
      if (sidebarCollapsed) {
        // When collapsed, clicking a tab expands the sidebar to that tab
        setActiveTab(tab)
        toggleSidebar()
      } else {
        setActiveTab(tab)
      }
    },
    [sidebarCollapsed, setActiveTab, toggleSidebar],
  )

  return (
    <div
      className={`
        h-full bg-sidebar-background text-sidebar-foreground
        border-r border-sidebar-border overflow-hidden
        transition-[width] duration-200 ease-in-out
        flex flex-col shrink-0
        ${sidebarCollapsed ? 'w-11' : 'w-72'}
      `}
    >
      {/* ================================================================= */}
      {/* Expanded state (288px)                                             */}
      {/* ================================================================= */}
      <div
        className={`
          h-full flex flex-col overflow-hidden
          ${sidebarCollapsed ? 'invisible w-0 overflow-hidden' : 'visible w-auto'}
        `}
      >
        {/* Header row with collapse toggle */}
        <div className="h-11 flex items-center justify-between px-3 border-b border-sidebar-border shrink-0">
          <span className="text-xs font-semibold text-sidebar-foreground">
            {TABS.find((t) => t.id === activeTab)?.label ?? ''}
          </span>
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Tab list */}
        <div className="flex gap-1 px-2 pt-2 pb-1 border-b border-sidebar-border shrink-0">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium
                  transition-colors flex-1 justify-center
                  ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  }
                `}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <TabContent tab={activeTab} />
        </div>
      </div>

      {/* ================================================================= */}
      {/* Collapsed state (44px icon-only)                                  */}
      {/* ================================================================= */}
      <div
        className={`
          h-full flex flex-col items-center pt-2 gap-1
          ${sidebarCollapsed ? 'visible' : 'invisible w-0 overflow-hidden'}
        `}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab
          const Icon = tab.icon
          const button = (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                flex items-center justify-center w-9 h-9 rounded-md transition-colors
                ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                }
              `}
            >
              <Icon size={18} />
            </button>
          )

          return (
            <Tooltip key={tab.id}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {tab.label}
              </TooltipContent>
            </Tooltip>
          )
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Expand toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-9 h-9 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors mb-2"
            >
              <ChevronRight size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Expand sidebar
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
