import { PawPrint } from 'lucide-react'

// header 背景的貓爪裝飾；style 可覆寫位置
const PawDecor = ({ size = 64, color = '#fff', opacity = 0.12, style }) => (
  <PawPrint
    size={size}
    color={color}
    strokeWidth={1.75}
    style={{ position: 'absolute', right: 10, bottom: -10, opacity, pointerEvents: 'none', userSelect: 'none', ...style }}
  />
)

export default PawDecor
