import { CanvasWrapper } from './components/CanvasWrapper'
import { LayerPanel } from './components/LayerPanel'

function App() {
  return (
    <div className="w-screen h-screen overflow-hidden flex">
      <LayerPanel />
      <div className="flex-1">
        <CanvasWrapper />
      </div>
    </div>
  )
}

export default App
