// ---------------------------------------------------------------------------
// App — Application shell with React Router.
//
// Layout route pattern: AppShell (TopBar + TabbedSidebar + Outlet) wraps
// child routes for CanvasPage, ProjectsPage, SettingsPage.
//
// D-01: Hybrid navigation model — primary views use React Router.
// D-02: Minimal top bar with global operations.
// D-03/D-04: Left unified panel with tab switching, collapsible to 44px.
// ---------------------------------------------------------------------------

import { Suspense } from 'react'
import { Routes, Route, Outlet } from 'react-router-dom'
import { TopBar } from './components/TopBar'
import { TabbedSidebar } from './components/TabbedSidebar'
import { CanvasPage } from './pages/CanvasPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SettingsPage } from './pages/SettingsPage'

// ---------------------------------------------------------------------------
// AppShell layout
// ---------------------------------------------------------------------------

function AppShell() {
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-background text-foreground">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <TabbedSidebar />
        <main className="flex-1 relative overflow-hidden">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">加载中...</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App — Router entry point
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<CanvasPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
