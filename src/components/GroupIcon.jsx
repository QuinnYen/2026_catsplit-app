import { GROUP_ICONS, GROUP_COLORS, DEFAULT_GROUP_ICON, DEFAULT_GROUP_COLOR } from '../config/groupIcons'

// onDark：放在橘色 header 上時，改用半透明白底 + 白色圖示
const GroupIcon = ({ icon, color, size = 48, onDark = false }) => {
  const Icon = GROUP_ICONS[icon] || GROUP_ICONS[DEFAULT_GROUP_ICON]
  const palette = GROUP_COLORS[color] || GROUP_COLORS[DEFAULT_GROUP_COLOR]
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: onDark ? 'rgba(255,255,255,0.25)' : palette.bg,
    }}>
      <Icon size={size * 0.5} color={onDark ? '#fff' : palette.fg} strokeWidth={2} />
    </div>
  )
}

export default GroupIcon
