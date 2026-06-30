// ---------------------------------------------------------------------------
// ConnectionLine — Custom React Flow connection line component
// Renders a bezier curve preview during drag-to-connect.
// Green when valid, red when invalid (per D-36).
// ---------------------------------------------------------------------------

import { type ConnectionLineComponent } from '@xyflow/react'

const ConnectionLine: ConnectionLineComponent = ({
  fromX,
  fromY,
  toX,
  toY,
  connectionStatus,
}) => {
  const isInvalid = connectionStatus === 'invalid'
  const strokeColor = isInvalid
    ? 'var(--color-connection-invalid)'
    : 'var(--color-connection-valid)'

  // Bezier control point at midpoint on X axis
  const midX = (fromX + toX) / 2

  return (
    <g>
      <path
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        className="react-flow__edge-path"
        d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
      />
    </g>
  )
}

export { ConnectionLine }
export default ConnectionLine
