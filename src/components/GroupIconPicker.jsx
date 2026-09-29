import { GROUP_ICONS, GROUP_COLORS, DEFAULT_GROUP_ICON, DEFAULT_GROUP_COLOR } from '../config/groupIcons'

const GroupIconPicker = ({ icon, color, onChange, disabled = false }) => {
  const currentIcon = icon || DEFAULT_GROUP_ICON
  const currentColor = color || DEFAULT_GROUP_COLOR
  const palette = GROUP_COLORS[currentColor]

  return (
    <div style={{ opacity: disabled ? 0.6 : 1 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {Object.entries(GROUP_COLORS).map(([key, c]) => (
          <button
            key={key}
            onClick={() => onChange({ iconColor: key })}
            disabled={disabled}
            aria-label={key}
            style={{
              width: 28, height: 28, borderRadius: '50%', cursor: disabled ? 'not-allowed' : 'pointer', padding: 0,
              background: c.fg, border: '2px solid #fff',
              boxShadow: currentColor === key ? `0 0 0 2px ${c.fg}` : 'none',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.entries(GROUP_ICONS).map(([key, Icon]) => {
          const active = currentIcon === key
          return (
            <button
              key={key}
              onClick={() => onChange({ icon: key })}
              disabled={disabled}
              aria-label={key}
              style={{
                width: 42, height: 42, borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: active ? `1.5px solid ${palette.fg}` : '0.5px solid #f0d5c0',
                background: active ? palette.bg : '#fff8f4',
              }}
            >
              <Icon size={20} color={active ? palette.fg : '#b08060'} strokeWidth={2} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default GroupIconPicker
